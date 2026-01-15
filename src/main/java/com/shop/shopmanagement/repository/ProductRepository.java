package com.shop.shopmanagement.repository;

import com.shop.shopmanagement.model.Category;
import com.shop.shopmanagement.model.Product;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    // Find by Category (Unsorted)
    List<Product> findByCategory(Category category);

    // Find by Category (Sorted)
    List<Product> findByCategory(Category category, Sort sort);

    // Global Search (Sorted)
    List<Product> findByNameContainingIgnoreCase(String name, Sort sort);

    // Search within Category (Sorted)
    List<Product> findByCategoryAndNameContainingIgnoreCase(Category category, String name, Sort sort);
    
}