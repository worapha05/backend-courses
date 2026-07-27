from django.contrib import messages
from django.shortcuts import redirect, render

from .forms import InquiryForm


def inquiry_create(request):
    """POST form พร้อม CSRF — CsrfViewMiddleware ตรวจ token อัตโนมัติ."""
    if request.method == "POST":
        form = InquiryForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, "ส่งข้อความเรียบร้อย ขอบคุณครับ/ค่ะ")
            return redirect("contact:thanks")
    else:
        form = InquiryForm()
    return render(request, "contact/form.html", {"form": form})


def inquiry_thanks(request):
    return render(request, "contact/thanks.html")
