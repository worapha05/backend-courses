from django.utils import timezone
from celery import shared_task

from .exporters import export_dir, export_orders_csv, export_orders_xlsx
from .models import ExportJob


@shared_task(bind=True, max_retries=2)
def run_order_export(self, job_id: int) -> dict:
    job = ExportJob.objects.get(pk=job_id)
    job.status = ExportJob.Status.RUNNING
    job.save(update_fields=["status"])
    try:
        dest = export_dir() / f"orders_{job.id}.{job.format}"
        if job.format == ExportJob.Format.CSV:
            count = export_orders_csv(dest)
        else:
            count = export_orders_xlsx(dest)
        job.file_path = str(dest)
        job.row_count = count
        job.status = ExportJob.Status.DONE
        job.finished_at = timezone.now()
        job.save()
        return {"job_id": job.id, "rows": count}
    except Exception as exc:  # noqa: BLE001
        job.status = ExportJob.Status.FAILED
        job.error_message = str(exc)
        job.finished_at = timezone.now()
        job.save()
        raise
