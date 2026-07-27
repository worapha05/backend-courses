from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Customer, ExportJob, Order, OrderLine, User

admin.site.register(User, UserAdmin)
admin.site.register(Customer)
admin.site.register(Order)
admin.site.register(OrderLine)
admin.site.register(ExportJob)
