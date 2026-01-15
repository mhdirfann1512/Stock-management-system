package com.shop.shopmanagement.controller;

import com.shop.shopmanagement.dto.DashboardStats;
import com.shop.shopmanagement.model.Product;
import com.shop.shopmanagement.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/stats")
public class StatsController {

    @Autowired
    private ProductRepository productRepository;

    @GetMapping
    public DashboardStats getStats() {
        List<Product> allProducts = productRepository.findAll();

        long totalCount = allProducts.size();
        long lowStock = 0;
        BigDecimal totalValue = BigDecimal.ZERO;

        for (Product p : allProducts) {
            // Calculate Total Value
            BigDecimal quantity = new BigDecimal(p.getQuantity());
            BigDecimal productTotal = p.getPrice().multiply(quantity);
            totalValue = totalValue.add(productTotal);

            // Check Low Stock (Hardcoded threshold for backend stats)
            if (p.getQuantity() < 5) {
                lowStock++;
            }
        }

        return new DashboardStats(totalCount, totalValue, lowStock);
    }
}