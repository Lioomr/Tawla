from urllib.parse import parse_qs

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.core.exceptions import ObjectDoesNotExist
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

from apps.sessions.exceptions import ExpiredSessionError, InvalidSessionError
from apps.sessions.services import get_valid_session_by_token
from apps.restaurants.models import Staff, StaffRole


KITCHEN_GROUP_PREFIX = "kitchen_updates"
WAITER_GROUP_PREFIX = "waiter_updates"


def session_orders_group(session_token: str) -> str:
    return f"session_orders_{session_token}"


def kitchen_group(restaurant_id: int) -> str:
    return f"{KITCHEN_GROUP_PREFIX}_{restaurant_id}"


def waiter_group(restaurant_id: int) -> str:
    return f"{WAITER_GROUP_PREFIX}_{restaurant_id}"


class SessionOrdersConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        query_params = parse_qs(self.scope["query_string"].decode())
        session_token = query_params.get("session_token", [""])[0].strip()
        if not session_token:
            await self.close(code=4401)
            return

        try:
            await self._get_valid_session(session_token)
        except InvalidSessionError:
            await self.close(code=4401)
            return
        except ExpiredSessionError:
            await self.close(code=4403)
            return

        self.group_name = session_orders_group(session_token)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        group_name = getattr(self, "group_name", None)
        if group_name:
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def order_created(self, event):
        await self.send_json(event["payload"])

    async def order_updated(self, event):
        await self.send_json(event["payload"])

    @database_sync_to_async
    def _get_valid_session(self, session_token):
        return get_valid_session_by_token(session_token=session_token)


class StaffUpdatesConsumer(AsyncJsonWebsocketConsumer):
    allowed_roles = set()
    group_factory = None

    async def connect(self):
        query_params = parse_qs(self.scope["query_string"].decode())
        access_token = query_params.get("access_token", [""])[0].strip()
        if not access_token:
            await self.close(code=4401)
            return

        try:
            staff = await self._get_staff_from_access_token(access_token)
        except (ObjectDoesNotExist, TokenError):
            await self.close(code=4401)
            return

        if staff.role not in self.allowed_roles:
            await self.close(code=4403)
            return

        self.group_name = self.group_factory(staff.restaurant_id)
        await self.accept()
        await self.channel_layer.group_add(self.group_name, self.channel_name)

    async def disconnect(self, close_code):
        group_name = getattr(self, "group_name", None)
        if group_name:
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def order_created(self, event):
        await self.send_json(event["payload"])

    async def order_updated(self, event):
        await self.send_json(event["payload"])

    @database_sync_to_async
    def _get_staff_from_access_token(self, access_token):
        token = AccessToken(access_token)
        user_id = token.get("user_id")
        if not user_id:
            raise TokenError("missing user id")

        return Staff.objects.select_related("user").get(user_id=user_id)


class KitchenConsumer(StaffUpdatesConsumer):
    allowed_roles = {StaffRole.KITCHEN, StaffRole.ADMIN}
    group_factory = staticmethod(kitchen_group)


class WaiterConsumer(StaffUpdatesConsumer):
    allowed_roles = {StaffRole.WAITER, StaffRole.ADMIN}
    group_factory = staticmethod(waiter_group)
