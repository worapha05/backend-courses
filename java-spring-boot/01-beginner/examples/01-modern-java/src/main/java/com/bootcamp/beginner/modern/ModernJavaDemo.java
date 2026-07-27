package com.bootcamp.beginner.modern;

import java.math.BigDecimal;
import java.util.List;
import java.util.Objects;
import java.util.logging.Logger;

public final class ModernJavaDemo {

    private static final Logger LOG = Logger.getLogger(ModernJavaDemo.class.getName());

    public static void main(String[] args) {
        List<Order> orders = List.of(
                new Order("o-1", "c-1", Status.PAID, new Money(new BigDecimal("1200"), "THB")),
                new Order("o-2", "c-1", Status.PENDING, new Money(new BigDecimal("500"), "THB")),
                new Order("o-3", "c-2", Status.PAID, new Money(new BigDecimal("990"), "THB")),
                new Order("o-4", "c-2", Status.CANCELLED, new Money(new BigDecimal("100"), "THB"))
        );

        List<OrderSummary> paid = orders.stream()
                .filter(o -> o.status() == Status.PAID)
                .map(o -> new OrderSummary(o.id(), o.customerId(), o.total()))
                .toList();

        LOG.info("=== Paid orders ===");
        paid.forEach(o -> LOG.info(o.toString()));

        PaymentResult result = settle(orders.getFirst());
        String label = switch (result) {
            case PaymentResult.Success s -> "OK:" + s.transactionId();
            case PaymentResult.Failed f -> "FAIL:" + f.reason();
            case PaymentResult.Pending p -> "WAIT:" + p.reference();
        };
        LOG.info("Settlement => " + label);
    }

    private static PaymentResult settle(Order order) {
        return switch (order.status()) {
            case PAID -> new PaymentResult.Success("tx-" + order.id());
            case PENDING -> new PaymentResult.Pending("ref-" + order.id());
            case CANCELLED -> new PaymentResult.Failed("order cancelled");
        };
    }

    public enum Status { PENDING, PAID, CANCELLED }

    public record Money(BigDecimal amount, String currency) {
        public Money {
            Objects.requireNonNull(amount, "amount");
            Objects.requireNonNull(currency, "currency");
            if (amount.signum() < 0) {
                throw new IllegalArgumentException("amount must be >= 0");
            }
        }
    }

    public record Order(String id, String customerId, Status status, Money total) {}

    public record OrderSummary(String orderId, String customerId, Money total) {}

    public sealed interface PaymentResult
            permits PaymentResult.Success, PaymentResult.Failed, PaymentResult.Pending {

        record Success(String transactionId) implements PaymentResult {}
        record Failed(String reason) implements PaymentResult {}
        record Pending(String reference) implements PaymentResult {}
    }
}
