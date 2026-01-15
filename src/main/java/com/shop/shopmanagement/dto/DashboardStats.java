package com.shop.shopmanagement.dto;

import java.math.BigDecimal;

public class DashboardStats {
    
    private final long totalProducts;
    private final BigDecimal totalInventoryValue;
    private final long lowStockCount;

    public DashboardStats(long totalProducts, BigDecimal totalInventoryValue, long lowStockCount) {
        this.totalProducts = totalProducts;
        this.totalInventoryValue = totalInventoryValue;
        this.lowStockCount = lowStockCount;
    }

    public long getTotalProducts() {
        return totalProducts;
    }

    public BigDecimal getTotalInventoryValue() {
        return totalInventoryValue;
    }

    public long getLowStockCount() {
        return lowStockCount;
    }
}