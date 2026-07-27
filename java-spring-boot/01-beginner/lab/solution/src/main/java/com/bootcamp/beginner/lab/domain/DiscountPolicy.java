package com.bootcamp.beginner.lab.domain;

import java.math.BigDecimal;
import java.math.RoundingMode;

public sealed interface DiscountPolicy
        permits DiscountPolicy.NoDiscount, DiscountPolicy.VipDiscount, DiscountPolicy.BulkDiscount {

    BigDecimal apply(BigDecimal subtotal, int totalQuantity);

    static DiscountPolicy forCustomer(CustomerType type) {
        return switch (type) {
            case REGULAR -> new NoDiscount();
            case VIP -> new VipDiscount();
            case BULK -> new BulkDiscount();
        };
    }

    record NoDiscount() implements DiscountPolicy {
        @Override
        public BigDecimal apply(BigDecimal subtotal, int totalQuantity) {
            return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        }
    }

    record VipDiscount() implements DiscountPolicy {
        @Override
        public BigDecimal apply(BigDecimal subtotal, int totalQuantity) {
            return subtotal.multiply(new BigDecimal("0.10")).setScale(2, RoundingMode.HALF_UP);
        }
    }

    record BulkDiscount() implements DiscountPolicy {
        @Override
        public BigDecimal apply(BigDecimal subtotal, int totalQuantity) {
            if (totalQuantity < 10) {
                return BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
            }
            return subtotal.multiply(new BigDecimal("0.15")).setScale(2, RoundingMode.HALF_UP);
        }
    }
}
