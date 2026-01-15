package com.shop.shopmanagement.controller;

import com.shop.shopmanagement.model.Category;
import com.shop.shopmanagement.repository.CategoryRepository;
import com.shop.shopmanagement.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
public class DashboardController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        Map<String, Object> stats = new HashMap<>();
        
        // Total count
        stats.put("totalProducts", productRepository.count());

        // Products per category
        List<Category> categories = categoryRepository.findAll();
        Map<String, Long> productsPerCategory = new HashMap<>();
        
        for (Category c : categories) {
            long count = productRepository.findByCategory(c).size();
            productsPerCategory.put(c.getName(), count);
        }
        
        stats.put("categories", productsPerCategory);
        return stats;
    }
}