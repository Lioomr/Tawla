def clear_file_field(instance, field_name):
    field = getattr(instance, field_name)
    previous_name = field.name if field else None
    if field:
        field.delete(save=False)
    setattr(instance, field_name, None)
    instance.save(update_fields=[field_name, "updated_at"])
    return previous_name
