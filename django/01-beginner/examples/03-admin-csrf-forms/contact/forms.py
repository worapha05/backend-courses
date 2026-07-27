from django import forms
from .models import Inquiry


class InquiryForm(forms.ModelForm):
    class Meta:
        model = Inquiry
        fields = ("name", "email", "subject", "message")
        widgets = {
            "message": forms.Textarea(attrs={"rows": 5}),
        }

    def clean_subject(self):
        subject = self.cleaned_data["subject"].strip()
        if len(subject) < 5:
            raise forms.ValidationError("หัวข้อต้องยาวอย่างน้อย 5 ตัวอักษร")
        return subject
