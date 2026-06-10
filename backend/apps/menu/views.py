from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.responses import error_response
from apps.menu.serializers import CategorySerializer
from apps.menu.services import get_menu_categories_for_restaurant
from apps.restaurants.serializers import RestaurantBrandingSerializer
from apps.sessions.exceptions import ExpiredSessionError, InvalidSessionError
from apps.sessions.services import get_valid_session_from_headers


class MenuListView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        try:
            session = get_valid_session_from_headers(headers=request.META)
        except InvalidSessionError:
            return error_response(code="invalid_session", message="invalid session", status_code=status.HTTP_401_UNAUTHORIZED)
        except ExpiredSessionError:
            return error_response(code="expired_session", message="expired session", status_code=status.HTTP_403_FORBIDDEN)

        request.session_context = session
        restaurant = session.table.restaurant
        categories = get_menu_categories_for_restaurant(
            restaurant=restaurant
        )
        restaurant_serializer = RestaurantBrandingSerializer(
            restaurant,
            context={"request": request},
        )
        category_serializer = CategorySerializer(
            categories,
            many=True,
            context={"request": request},
        )
        return Response(
            {
                "restaurant": restaurant_serializer.data,
                "categories": category_serializer.data,
            },
            status=status.HTTP_200_OK,
        )
