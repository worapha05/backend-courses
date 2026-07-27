from django import forms
from django.db import transaction

from .models import Book, Loan, Member


class LoanForm(forms.ModelForm):
    class Meta:
        model = Loan
        fields = ("book", "member")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["book"].queryset = Book.objects.filter(is_active=True, copies_available__gt=0)

    def save(self, commit: bool = True) -> Loan:
        with transaction.atomic():
            book = Book.objects.select_for_update().get(pk=self.cleaned_data["book"].pk)
            if book.copies_available < 1:
                raise forms.ValidationError("หนังสือหมดชั่วคราว")
            book.copies_available -= 1
            book.save(update_fields=["copies_available"])
            self.instance.book = book
            self.instance.member = self.cleaned_data["member"]
            return super().save(commit=commit)
