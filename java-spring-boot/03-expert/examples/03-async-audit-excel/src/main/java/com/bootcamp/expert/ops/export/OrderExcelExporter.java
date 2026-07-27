package com.bootcamp.expert.ops.export;

import java.io.IOException;
import java.io.OutputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

@Service
public class OrderExcelExporter {

    public enum JobStatus { PENDING, RUNNING, DONE, FAILED }

    public record ExportJob(String id, JobStatus status, Path file, String error) {}

    public record OrderRow(String orderId, String customer, BigDecimal total) {}

    private final Map<String, ExportJob> jobs = new ConcurrentHashMap<>();
    private final ExportRunner exportRunner;

    public OrderExcelExporter(@Lazy ExportRunner exportRunner) {
        this.exportRunner = exportRunner;
    }

    public ExportJob start(List<OrderRow> rows) {
        String id = UUID.randomUUID().toString();
        ExportJob job = new ExportJob(id, JobStatus.PENDING, null, null);
        jobs.put(id, job);
        exportRunner.run(id, rows);
        return job;
    }

    public ExportJob get(String id) {
        return jobs.get(id);
    }

    void execute(String jobId, List<OrderRow> rows) {
        jobs.put(jobId, new ExportJob(jobId, JobStatus.RUNNING, null, null));
        try {
            Path file = Files.createTempFile("orders-", ".xlsx");
            writeWorkbook(file, rows);
            jobs.put(jobId, new ExportJob(jobId, JobStatus.DONE, file, null));
        } catch (Exception ex) {
            jobs.put(jobId, new ExportJob(jobId, JobStatus.FAILED, null, ex.getMessage()));
        }
    }

    private void writeWorkbook(Path file, List<OrderRow> rows) throws IOException {
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100);
             OutputStream out = Files.newOutputStream(file)) {
            Sheet sheet = workbook.createSheet("Orders");
            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont();
            font.setBold(true);
            font.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(font);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_TEAL.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row header = sheet.createRow(0);
            String[] cols = {"Order ID", "Customer", "Total"};
            for (int i = 0; i < cols.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(cols[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 20 * 256);
            }

            int r = 1;
            for (OrderRow row : rows) {
                Row excelRow = sheet.createRow(r++);
                excelRow.createCell(0).setCellValue(row.orderId());
                excelRow.createCell(1).setCellValue(row.customer());
                excelRow.createCell(2).setCellValue(row.total().doubleValue());
            }
            sheet.createFreezePane(0, 1);
            workbook.write(out);
            workbook.dispose();
        }
    }
}
