const API_BASE = "http://localhost:8080/api";

let currentProducts = []; 

let LOW_STOCK_THRESHOLD = 5; 

const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer)
        toast.addEventListener('mouseleave', Swal.resumeTimer)
    }
});

document.addEventListener("DOMContentLoaded", () => {
    loadSettings(); 
    
    if (document.getElementById("productTableBody")) {
        loadStats();
        loadCategories(); 
        loadProducts();
    }
});

function showPage(pageId) {
    
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.remove('active-section'));
    
    document.getElementById(`section-${pageId}`).classList.add('active-section');
    
    document.querySelectorAll('.list-group-item').forEach(link => link.classList.remove('active-nav'));
    const activeLink = document.getElementById(`nav-${pageId}`);
    if(activeLink) activeLink.classList.add('active-nav');

    const titles = {
        'dashboard': 'Dashboard Overview',
        'inventory': 'Inventory Management',
        'categories': 'Category Manager',
        'alerts': 'Stock Alerts',
        'settings': 'Settings'
    };
    document.getElementById('page-title').innerText = titles[pageId] || 'Shop Manager';
}

function showLogin() {
    document.getElementById("loginForm").style.display = "block";
    document.getElementById("registerForm").style.display = "none";
}

function showRegister() {
    document.getElementById("loginForm").style.display = "none";
    document.getElementById("registerForm").style.display = "block";
}

async function register() {
    const user = {
        username: document.getElementById("regUsername").value,
        email: document.getElementById("regEmail").value,
        passwordHash: document.getElementById("regPassword").value
    };

    const res = await fetch(`${API_BASE}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user)
    });
    const text = await res.text();
    document.getElementById("registerMessage").innerText = text;
}

async function login() {
    const user = {
        username: document.getElementById("loginUsername").value,
        password: document.getElementById("loginPassword").value
    };

    const res = await fetch(`${API_BASE}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user)
    });

    if (res.status === 200) {
        localStorage.setItem("loggedIn", "true");
        localStorage.setItem("username", user.username);
        window.location.href = "dashboard.html";
    } else {
        document.getElementById("loginMessage").innerText = "Invalid login";
        document.getElementById("loginMessage").style.color = "red";
    }
}

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        if (response.ok) {
            const data = await response.json();
            document.getElementById('stat-total-products').innerText = data.totalProducts || 0;
            
            let val = data.totalInventoryValue || 0;
            document.getElementById('stat-total-value').innerText = 'RM ' + val.toLocaleString('en-US', { minimumFractionDigits: 2 });
        }
    } catch (error) {
        console.error('Stats Error:', error);
    }
}

let inventoryChart = null; 

function updateDashboardChart(products) {
    const ctx = document.getElementById('inventoryChart').getContext('2d');
    
    const categoryCounts = {};
    products.forEach(p => {
        const catName = p.category ? p.category.name : "Uncategorized";
        categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
    });

    const labels = Object.keys(categoryCounts);
    const data = Object.values(categoryCounts);

    if (inventoryChart) inventoryChart.destroy();

    inventoryChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Products per Category',
                data: data,
                backgroundColor: 'rgba(13, 110, 253, 0.6)',
                borderColor: 'rgba(13, 110, 253, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true } }
        }
    });
}

async function loadCategories() {
    try {
        const res = await fetch(`${API_BASE}/categories`);
        const categories = await res.json();
        
        const addSelect = document.getElementById("pCategory");
        const filterSelect = document.getElementById("filterCategory");
        const listGroup = document.getElementById("categoryListGroup");

        if(addSelect) addSelect.innerHTML = '<option value="">Select Category...</option>';
        if(filterSelect) filterSelect.innerHTML = '<option value="">All Categories</option>';
        if(listGroup) listGroup.innerHTML = '';

        const template = document.getElementById('template-category-item');

        categories.forEach(cat => {

            if(addSelect) {
                const opt = new Option(cat.name, cat.id);
                addSelect.add(opt);
            }
            if(filterSelect) {
                const opt = new Option(cat.name, cat.id);
                filterSelect.add(opt);
            }
            
            if(listGroup && template) {
                const clone = template.content.cloneNode(true);
                clone.querySelector('.cat-name').innerText = cat.name;
                
                const deleteBtn = clone.querySelector('.btn-delete');
                deleteBtn.onclick = () => deleteCategory(cat.id);
                
                listGroup.appendChild(clone);
            }
        });
    } catch (e) { console.error("Category Load Error", e); }
}

async function createNewCategory() {
    const name = document.getElementById("newCategoryName").value;
    if(!name) return Toast.fire({ icon: 'warning', title: 'Enter a name' });

    try {
        const res = await fetch(`${API_BASE}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name })
        });
        if(res.ok) {
            document.getElementById("newCategoryName").value = "";
            loadCategories(); 
            Toast.fire({ icon: 'success', title: 'Category Added' });
        }
    } catch(e) { console.error(e); }
}

async function deleteCategory(id) {
    if(!confirm("Delete this category?")) return;
    try {
        await fetch(`${API_BASE}/categories/${id}`, { method: 'DELETE' });
        loadCategories();
    } catch(e) { console.error(e); }
}

async function loadProducts() {
    const catId = document.getElementById("filterCategory").value;
    const search = document.getElementById("searchBox").value;

    let url = `${API_BASE}/products?`;
    if (catId) url += `categoryId=${catId}&`;
    if (search) url += `search=${search}`;

    try {
        const res = await fetch(url);
        currentProducts = await res.json(); 
        
        applyFiltersAndSort(); 
        
        updateDashboardChart(currentProducts); 
        loadStockAlerts(currentProducts); 
    } catch (error) {
        console.error("Load Products Error:", error);
        document.getElementById("productTableBody").innerHTML = "<tr><td colspan='7' class='text-center text-danger'>Error loading data. Is Backend running?</td></tr>";
    }
}

function applyFiltersAndSort() {
    let processedList = [...currentProducts]; // Create a copy of the array

    const statusFilter = document.getElementById("filterStatus").value;
    if (statusFilter === 'ACTIVE') {
        processedList = processedList.filter(p => p.status === 'ACTIVE');
    } else if (statusFilter === 'INACTIVE') {
        processedList = processedList.filter(p => p.status === 'INACTIVE');
    }

    const sortValue = document.getElementById("sortBy").value;
    if (sortValue === 'priceHigh') {
        processedList.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortValue === 'priceLow') {
        processedList.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortValue === 'stockHigh') {
        processedList.sort((a, b) => Number(b.quantity) - Number(a.quantity));
    } else if (sortValue === 'stockLow') {
        processedList.sort((a, b) => Number(a.quantity) - Number(b.quantity));
    } 

    renderTable(processedList);
}
 
function renderTable(products) {
    const tbody = document.getElementById("productTableBody");
    tbody.innerHTML = ""; 

    if(!products || products.length === 0) {
        tbody.innerHTML = "<tr><td colspan='7' class='text-center'>No products found</td></tr>";
        return;
    }

    const template = document.getElementById('template-product-row');

    products.forEach(p => {
        const clone = template.content.cloneNode(true);
        
        const img = clone.querySelector('.product-thumb');
        img.src = p.imageUrl ? p.imageUrl : 'https://via.placeholder.com/50?text=No+Img';

        clone.querySelector('.product-sku').innerText = p.sku || "No SKU";
        if(!p.sku) clone.querySelector('.product-sku').classList.add("fst-italic", "text-muted");
        
        clone.querySelector('.product-name').innerText = p.name;
        clone.querySelector('.product-cat').innerText = p.category ? p.category.name : "Uncategorized";

        clone.querySelector('.product-price').innerText = 'RM' + (p.price || 0).toFixed(2);

        const badgeElement = clone.querySelector('.stock-badge');
        badgeElement.innerText = p.quantity;
        
        if (p.quantity === 0) {
            badgeElement.classList.add("bg-stock-red");
        } else if (p.quantity <= LOW_STOCK_THRESHOLD) { 
            badgeElement.classList.add("bg-stock-orange");
        } else {
            badgeElement.classList.add("bg-stock-blue");
        }

        clone.querySelector('.btn-stock-out').onclick = () => updateStock(p.id, 'out');
        clone.querySelector('.btn-stock-in').onclick = () => updateStock(p.id, 'in');

        const statusCell = clone.querySelector('.product-status-cell');
        if(p.status === 'INACTIVE') {
            statusCell.innerHTML = '<span class="badge bg-secondary">Inactive</span>';
        } else {
            statusCell.innerHTML = '<span class="badge bg-success">Active</span>';
        }

        const formatDate = (dateStr) => {
            if (!dateStr) return '-';
            const date = new Date(dateStr);
            return date.toLocaleDateString() + ' <small class="text-muted">' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + '</small>';
        };

        clone.querySelector('.product-last-in').innerHTML = '<i class="fas fa-arrow-down"></i> ' + formatDate(p.lastStockIn);
        clone.querySelector('.product-last-out').innerHTML = '<i class="fas fa-arrow-up"></i> ' + formatDate(p.lastStockOut);

        clone.querySelector('.btn-edit').onclick = () => editProduct(p);
        clone.querySelector('.btn-delete').onclick = () => deleteProduct(p.id);

        tbody.appendChild(clone);
    });
}

function loadStockAlerts(products) {
    const tbody = document.getElementById("alertsTableBody");
    tbody.innerHTML = ""; 

    const header = document.querySelector("#section-alerts .card-header h5");
    if(header) header.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Low Stock Items (< ${LOW_STOCK_THRESHOLD} units)`;

    const lowStockItems = products.filter(p => p.quantity <= LOW_STOCK_THRESHOLD); 

    const dashboardCard = document.getElementById('stat-low-stock');
    if (dashboardCard) dashboardCard.innerText = lowStockItems.length;

    if(lowStockItems.length === 0) {
        tbody.innerHTML = "<tr><td colspan='3' class='text-center text-muted'>All stock levels are good!</td></tr>";
        return;
    }

    const template = document.getElementById('template-alert-row');
    lowStockItems.forEach(p => {
        const clone = template.content.cloneNode(true);

        clone.querySelector('.alert-name').innerText = p.name;
        clone.querySelector('.alert-sku').innerText = `(${p.sku})`;
        clone.querySelector('.alert-qty').innerText = `${p.quantity} Units Left`;
        
        clone.querySelector('.btn-restock').onclick = () => updateStock(p.id, 'in');

        tbody.appendChild(clone);
    });
}

async function deleteProduct(id) {
    const result = await Swal.fire({
        title: 'Are you sure?', text: "You won't be able to revert this!", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'Yes, delete it!'
    });
    if (result.isConfirmed) {
        await fetch(`${API_BASE}/products/${id}`, { method: "DELETE" });
        loadProducts(); loadStats(); // Refresh UI
        Swal.fire('Deleted!', 'Your product has been removed.', 'success');
    }
}

async function updateStock(id, action) {
    const title = action === 'in' ? 'Stock In 🚚' : 'Stock Out 🏪';
    const confirmBtnText = action === 'in' ? 'Add Stock' : 'Remove Stock';
    const confirmBtnColor = action === 'in' ? '#1cc88a' : '#f6c23e'; 
    
    const { value: amount } = await Swal.fire({
        title: title, input: 'number', inputLabel: 'Enter Quantity', inputPlaceholder: 'e.g. 10',
        showCancelButton: true, confirmButtonText: confirmBtnText, confirmButtonColor: confirmBtnColor,
        inputValidator: (value) => { if (!value || value <= 0) return 'Enter a valid amount!'; }
    });

    if (amount) {
        let qty = parseInt(amount);
        if (action === 'out') qty = -qty; 
        
        const res = await fetch(`${API_BASE}/products/${id}/stock?amount=${qty}`, { method: "POST" });
        
        if (res.ok) { 
            loadProducts(); loadStats(); 
            Toast.fire({ icon: 'success', title: 'Stock updated!' }); 
        } else { 
            const msg = await res.text(); 
            Swal.fire('Error', msg, 'error'); 
        }
    }
}

function openAddModal() {
    clearForm(); 
    document.getElementById("modalTitle").innerHTML = "<i class='fas fa-plus-circle'></i> Add New Product";
    const myModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('productModal'));
    myModal.show();
}

function editProduct(product) {

    document.getElementById("pSku").value = product.sku || "";
    document.getElementById("pStatus").value = product.status || "ACTIVE";
    document.getElementById("pId").value = product.id; 
    document.getElementById("pName").value = product.name;
    document.getElementById("pDesc").value = product.description || "";
    document.getElementById("pPrice").value = product.price;
    document.getElementById("pQty").value = product.quantity;
    if (product.category) document.getElementById("pCategory").value = product.category.id;
    
    document.getElementById("modalTitle").innerHTML = "<i class='fas fa-edit'></i> Edit Product";
    
    const myModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('productModal'));
    myModal.show();
}

async function saveProduct() {
    
    const sku = document.getElementById("pSku").value;
    const status = document.getElementById("pStatus").value;
    const id = document.getElementById("pId").value; // If empty, we are creating. If has value, we are updating.
    const name = document.getElementById("pName").value;
    const desc = document.getElementById("pDesc").value;
    const price = document.getElementById("pPrice").value;
    const qty = document.getElementById("pQty").value;
    const catId = document.getElementById("pCategory").value;
    const imageInput = document.getElementById("pImg");

    if (!catId) { Swal.fire('Error', 'Please select a category', 'error'); return; }

    const formData = new FormData();
    formData.append("sku", sku); formData.append("status", status);
    formData.append("name", name); formData.append("description", desc);
    formData.append("price", price); formData.append("quantity", qty);
    formData.append("categoryId", catId);
    if (imageInput.files[0]) formData.append("image", imageInput.files[0]);

    let method = "POST";
    let url = `${API_BASE}/products`;
    if (id) { 
        method = "PUT"; 
        url = `${API_BASE}/products/${id}`; 
    }

    const res = await fetch(url, { method: method, body: formData });
    if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('productModal')).hide();
        clearForm(); 
        loadProducts(); loadStats();
        Toast.fire({ icon: 'success', title: 'Saved Successfully!' });
    } else { 
        Swal.fire('Error', 'Failed to save', 'error'); 
    }
}

function clearForm() {
    document.getElementById("pSku").value = "";
    document.getElementById("pStatus").value = "ACTIVE";
    document.getElementById("pId").value = ""; 
    document.getElementById("pName").value = "";
    document.getElementById("pDesc").value = "";
    document.getElementById("pPrice").value = "";
    document.getElementById("pQty").value = "";
    document.getElementById("pImg").value = ""; 
    document.getElementById("pCategory").value = "";
}

async function changePassword() {
    const oldPass = document.getElementById("oldPass").value;
    const newPass = document.getElementById("newPass").value;
    const confirmPass = document.getElementById("confirmPass").value;

    if (newPass !== confirmPass) {
        Swal.fire('Error', 'New passwords do not match!', 'error');
        return;
    }

    if (newPass.length < 4) {
        Swal.fire('Warning', 'Password should be at least 4 characters.', 'warning');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/users/change-password`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ oldPassword: oldPass, newPassword: newPass })
        });

        const msg = await res.text();

        if (res.ok) {
            Swal.fire('Success', 'Password updated! Please login again.', 'success')
                .then(() => logout()); 
        } else {
            Swal.fire('Error', msg, 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Something went wrong.', 'error');
    }
}

function loadSettings() {
    
    const isDark = localStorage.getItem("darkMode") === "true";
    document.getElementById("darkModeToggle").checked = isDark;
    
    if(isDark) {
        document.body.style.backgroundColor = "#333";
        document.body.style.color = "#fff"; 
    } else {
        document.body.style.backgroundColor = "#f8f9fa";
        document.body.style.color = "#000";
    }

    const savedThreshold = localStorage.getItem("lowStockThreshold");
    if (savedThreshold) {
        LOW_STOCK_THRESHOLD = parseInt(savedThreshold);
    }
    
    const thresholdInput = document.getElementById("settingLowStock");
    if(thresholdInput) {
        thresholdInput.value = LOW_STOCK_THRESHOLD;
    }
}

function saveSettings() {
    const isDark = document.getElementById("darkModeToggle").checked;
    localStorage.setItem("darkMode", isDark);
    
    const inputVal = document.getElementById("settingLowStock").value;
    LOW_STOCK_THRESHOLD = parseInt(inputVal); 
    localStorage.setItem("lowStockThreshold", LOW_STOCK_THRESHOLD); 

    loadSettings();

    if(currentProducts.length > 0) {
        renderTable(currentProducts);    
        loadStockAlerts(currentProducts);
        loadStats(); 
    }

    Toast.fire({ icon: 'success', title: 'Settings Saved & Applied!' });
}

function loadUserDisplay() {
    const username = localStorage.getItem("username") || "Admin";

    const nameElement = document.getElementById("current-user-name");
    if (nameElement) nameElement.innerText = username;

    const imgElement = document.getElementById("current-user-img");
    if (imgElement) {
        imgElement.src = `https://ui-avatars.com/api/?name=${username}&background=764ba2&color=fff&bold=true`;
    }
}

function logout() {
    localStorage.removeItem("loggedIn");
    localStorage.removeItem("username");
    window.location.href = "index.html"; 
}

function exportToCSV() {
    window.location.href = `${API_BASE}/products/export-csv`;
    Toast.fire({
        icon: 'success',
        title: 'Downloading Inventory CSV...'
    });
}

loadUserDisplay();