package com.shop.shopmanagement.controller;

import com.shop.shopmanagement.model.Category;
import com.shop.shopmanagement.model.Product;
import com.shop.shopmanagement.repository.CategoryRepository;
import com.shop.shopmanagement.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    // Helper: Save file to project folder
    private String saveImage(MultipartFile file) throws IOException {
        String projectRoot = System.getProperty("user.dir");
        String folder = projectRoot + "/product-images/";

        Path uploadPath = Paths.get(folder);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String filename = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
        Path path = Paths.get(folder + filename);
        Files.copy(file.getInputStream(), path, StandardCopyOption.REPLACE_EXISTING);

        return "/images/" + filename;
    }

    // 1. Get All Products
    @GetMapping
    public List<Product> getAllProducts(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String search
    ) {
        Sort sort = Sort.by("id").ascending();

        if ("price_asc".equals(sortBy)) sort = Sort.by("price").ascending();
        else if ("price_desc".equals(sortBy)) sort = Sort.by("price").descending();
        else if ("name".equals(sortBy)) sort = Sort.by("name").ascending();

        if (categoryId != null) {
            Category category = categoryRepository.findById(categoryId).orElse(null);
            if (category != null) {
                if (search != null && !search.isEmpty()) {
                    return productRepository.findByCategoryAndNameContainingIgnoreCase(category, search, sort);
                }
                return productRepository.findByCategory(category, sort);
            }
        }
        
        if (search != null && !search.isEmpty()) {
            return productRepository.findByNameContainingIgnoreCase(search, sort);
        }
        
        return productRepository.findAll(sort);
    }

    // 2. Export CSV
    @GetMapping("/export-csv")
    public ResponseEntity<String> exportToCSV() {
        List<Product> products = productRepository.findAll(Sort.by("id").ascending());
        
        StringBuilder csv = new StringBuilder();
        csv.append("ID,SKU,Name,Category,Price,Quantity,Status,Date Added\n");

        for (Product p : products) {
            csv.append(p.getId()).append(",");
            csv.append(p.getSku() != null ? p.getSku() : "").append(",");
            
            String safeName = p.getName().replace("\"", "\"\""); 
            csv.append("\"").append(safeName).append("\",");
            
            String catName = (p.getCategory() != null) ? p.getCategory().getName() : "Uncategorized";
            csv.append(catName).append(",");
            
            csv.append(p.getPrice()).append(",");
            csv.append(p.getQuantity()).append(",");
            csv.append(p.getStatus()).append(",");
            csv.append(p.getCreatedAt()).append("\n");
        }

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=inventory_backup.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.toString());
    }

    // 3. Add Product
    @PostMapping
    public ResponseEntity<?> addProduct(
            @RequestParam("name") String name,
            @RequestParam("description") String description,
            @RequestParam("price") BigDecimal price,
            @RequestParam("quantity") Integer quantity,
            @RequestParam("categoryId") Long categoryId,
            @RequestParam(value = "sku", required = false) String sku,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "image", required = false) MultipartFile imageFile
    ) {
        try {
            Product product = new Product();
            product.setName(name);
            product.setDescription(description);
            product.setPrice(price);
            product.setQuantity(quantity);
            
            // Handle SKU
            if (sku == null || sku.trim().isEmpty()) {
                String randomSku = "SKU-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
                product.setSku(randomSku);
            } else {
                product.setSku(sku);
            }

            product.setStatus(status != null ? status : "ACTIVE");

            if (imageFile != null && !imageFile.isEmpty()) {
                product.setImageUrl(saveImage(imageFile));
            }

            Category category = categoryRepository.findById(categoryId).orElse(null);
            if (category == null) return ResponseEntity.badRequest().body("Invalid Category");
            product.setCategory(category);

            return ResponseEntity.ok(productRepository.save(product));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Error saving image");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: SKU already exists or invalid data.");
        }
    }

    // 4. Update Product
    @PutMapping("/{id}")
    public ResponseEntity<?> updateProduct(
            @PathVariable Long id,
            @RequestParam("name") String name,
            @RequestParam("description") String description,
            @RequestParam("price") BigDecimal price,
            @RequestParam("quantity") Integer quantity,
            @RequestParam("categoryId") Long categoryId,
            @RequestParam(value = "sku", required = false) String sku,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "image", required = false) MultipartFile imageFile
    ) {
        try {
            Product product = productRepository.findById(id).orElse(null);
            if (product == null) return ResponseEntity.notFound().build();

            product.setName(name);
            product.setDescription(description);
            product.setPrice(price);
            product.setQuantity(quantity);

            if (sku != null && !sku.trim().isEmpty()) {
                product.setSku(sku);
            }
            if (status != null) {
                product.setStatus(status);
            }

            if (imageFile != null && !imageFile.isEmpty()) {
                product.setImageUrl(saveImage(imageFile));
            }

            Category category = categoryRepository.findById(categoryId).orElse(null);
            product.setCategory(category);

            return ResponseEntity.ok(productRepository.save(product));
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Error updating image");
        } catch (Exception e) {
             return ResponseEntity.badRequest().body("Error: SKU collision or invalid data.");
        }
    }

    // 5. Update Stock
    @PostMapping("/{id}/stock")
    public ResponseEntity<?> updateStock(@PathVariable Long id, @RequestParam int amount) {
        Optional<Product> productOpt = productRepository.findById(id);
        if (productOpt.isEmpty()) return ResponseEntity.notFound().build();

        Product product = productOpt.get();
        int newQuantity = product.getQuantity() + amount;

        if (newQuantity < 0) return ResponseEntity.badRequest().body("Not enough stock!");

        product.setQuantity(newQuantity);

        if (amount > 0) product.setLastStockIn(LocalDateTime.now());
        else if (amount < 0) product.setLastStockOut(LocalDateTime.now());

        productRepository.save(product);
        return ResponseEntity.ok(product);
    }

    // 6. Delete Product
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        if (productRepository.existsById(id)) {
            productRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}