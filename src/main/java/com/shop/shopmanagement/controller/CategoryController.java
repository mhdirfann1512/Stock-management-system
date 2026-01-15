package com.shop.shopmanagement.controller;

import com.shop.shopmanagement.model.Category;
import com.shop.shopmanagement.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    @Autowired
    private CategoryRepository categoryRepository;

    @GetMapping
    public List<Category> getAllCategories() {
        return categoryRepository.findAll();
    }

    @PostMapping
    public ResponseEntity<String> addCategory(@RequestBody Category category) {
        if (categoryRepository.findByName(category.getName()).isPresent()) {
            return ResponseEntity.badRequest().body("Category already exists");
        }
        categoryRepository.save(category);
        return ResponseEntity.ok("Category added");
    }

    @PutMapping("/{id}")
    public ResponseEntity<String> editCategory(@PathVariable Long id, @RequestBody Category category) {
        Optional<Category> existing = categoryRepository.findById(id);
        if (existing.isPresent()) {
            Category c = existing.get();
            c.setName(category.getName());
            c.setDescription(category.getDescription());
            categoryRepository.save(c);
            return ResponseEntity.ok("Category updated");
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteCategory(@PathVariable Long id) {
        if (categoryRepository.existsById(id)) {
            categoryRepository.deleteById(id);
            return ResponseEntity.ok("Category deleted");
        }
        return ResponseEntity.notFound().build();
    }
}