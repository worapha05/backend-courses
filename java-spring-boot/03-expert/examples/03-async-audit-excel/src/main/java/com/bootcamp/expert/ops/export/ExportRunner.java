package com.bootcamp.expert.ops.export;

import java.util.List;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class ExportRunner {

    private final OrderExcelExporter exporter;

    public ExportRunner(OrderExcelExporter exporter) {
        this.exporter = exporter;
    }

    @Async
    public void run(String jobId, List<OrderExcelExporter.OrderRow> rows) {
        exporter.execute(jobId, rows);
    }
}
