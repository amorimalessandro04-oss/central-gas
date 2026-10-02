const STORAGE_KEY = 'central_gas_products_v1';
const CLIENTS_KEY = 'central_gas_clients_v1';
const ORDERS_KEY = 'central_gas_orders_v1';
const CART_KEY = 'central_gas_cart_v1';
const FINANCE_KEY = 'central_gas_finance_v1';
const ADMIN_PASSWORD = '1234';

const seededProducts = [
  { id: 'pg-13', name: 'Gás P13', category: 'Gás', price: 79.90, stock: 18, active: true },
  { id: 'pg-45', name: 'Gás P45', category: 'Gás', price: 169.90, stock: 12, active: true },
  { id: 'agua-1', name: 'Água mineral 20L', category: 'Água', price: 18.90, stock: 40, active: true },
  { id: 'agua-2', name: 'Água mineral 10L', category: 'Água', price: 12.90, stock: 58, active: true },
  { id: 'registro', name: 'Registro de pressão', category: 'Acessório', price: 34.90, stock: 9, active: true },
  { id: 'mangueira', name: 'Mangueira inox', category: 'Acessório', price: 59.90, stock: 7, active: true },
  { id: 'suporte-madeira', name: 'Suporte para gás madeira', category: 'Acessório', price: 24.90, stock: 15, active: true },
  { id: 'suporte-plastico', name: 'Suporte para gás plástico', category: 'Acessório', price: 22.90, stock: 19, active: true },
  { id: 'vasilhame', name: 'Vasilhame de gás', category: 'Gás', price: 120.00, stock: 6, active: true },
  { id: 'carvao', name: 'Carvão', category: 'Acessório', price: 17.90, stock: 21, active: true }
];

const REPORT_KEY = 'central_gas_report_manual_v1';

const state = {
  products: loadProducts(),
  clients: loadClients(),
  orders: loadOrders(),
  cart: loadCart(),
  movements: loadMovements(),
  report: loadReport(),
  currentView: 'home',
};

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function loadProducts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveJson(STORAGE_KEY, seededProducts);
      return [...seededProducts];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      saveJson(STORAGE_KEY, seededProducts);
      return [...seededProducts];
    }
    return parsed;
  } catch (error) {
    return [...seededProducts];
  }
}

function loadClients() {
  try {
    const raw = localStorage.getItem(CLIENTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function loadOrders() {
  try {
    const raw = localStorage.getItem(ORDERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadMovements() {
  try {
    const raw = localStorage.getItem(FINANCE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMovements() {
  saveJson(FINANCE_KEY, state.movements);
}

function loadReport() {
  try {
    const raw = localStorage.getItem(REPORT_KEY);
    if (!raw) {
      const initial = { entries: [], exits: [], results: [] };
      saveJson(REPORT_KEY, initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      exits: Array.isArray(parsed.exits) ? parsed.exits : [],
      results: Array.isArray(parsed.results) ? parsed.results : [],
    };
  } catch {
    return { entries: [], exits: [], results: [] };
  }
}

function saveReport() {
  saveJson(REPORT_KEY, state.report);
}

function addReportEntry(type, category, amount, description = '') {
  const safeCategory = String(category || '').trim();
  const safeDescription = String(description || '').trim() || safeCategory || 'Registro';

  if (!safeCategory || Number(amount || 0) <= 0) {
    alert('Informe categoria e valor válidos para o registro do relatório.');
    return;
  }

  const entry = {
    id: `report-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type,
    category: safeCategory,
    description: safeDescription,
    amount: Number(amount || 0),
    createdAt: new Date().toISOString(),
  };

  if (type === 'entry') state.report.entries.push(entry);
  if (type === 'exit') state.report.exits.push(entry);
  if (type === 'result') state.report.results.push(entry);

  saveReport();
  renderFinanceDashboard();
  renderAdmin();
}

function getCustomerKey(phone) {
  return String(phone || '').replace(/\D/g, '').slice(-11);
}

function saveCustomer(customer) {
  if (!customer || !customer.phone) return;
  const key = getCustomerKey(customer.phone);
  state.clients[key] = {
    ...state.clients[key],
    ...customer,
    phone: customer.phone,
    updatedAt: new Date().toISOString(),
  };
  saveJson(CLIENTS_KEY, state.clients);
}

function showView(viewName) {
  state.currentView = viewName;

  const viewMap = {
    home: 'homeView',
    catalog: 'catalogView',
    admin: 'adminView',
    settings: 'settingsView',
  };
  const target = viewMap[viewName] || 'homeView';

  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.toggle('active', screen.id === target);
  });

  const topbar = document.getElementById('topbar');
  topbar?.classList.remove('hidden');

  if (viewName === 'catalog') renderCatalog();
  if (viewName === 'admin') renderAdmin();
  if (viewName === 'settings') {
    document.getElementById('storeName')?.focus();
  }
}

function renderCatalog() {
  const grid = document.getElementById('catalogGrid');
  const cartItems = document.getElementById('cartItems');
  const cartCount = document.getElementById('cartCount');
  const subtotalValue = document.getElementById('subtotalValue');

  if (!grid || !cartItems) return;

  grid.innerHTML = state.products
    .filter((product) => product.active !== false)
    .map((product) => `
      <article class="product-card">
        <div class="product-tag">${product.category || 'Produtos'}</div>
        <h4>${product.name}</h4>
        <div class="meta">Entrega rápida</div>
        <div class="product-price">${formatCurrency(product.price)}</div>
        <div class="product-stock">Estoque: ${product.stock}</div>
        <button type="button" data-product-id="${product.id}">Adicionar</button>
      </article>
    `)
    .join('');

  grid.querySelectorAll('button[data-product-id]').forEach((button) => {
    button.addEventListener('click', () => addToCart(button.getAttribute('data-product-id')));
  });

  const subtotal = state.cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const totalItems = state.cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  cartCount.textContent = `${totalItems} item${totalItems === 1 ? '' : 's'}`;
  subtotalValue.textContent = formatCurrency(subtotal);

  if (!state.cart.length) {
    cartItems.innerHTML = '<div class="empty-cart">Seu carrinho está vazio.</div>';
    return;
  }

  cartItems.innerHTML = state.cart.map((item) => `
    <div class="cart-item">
      <div class="cart-info">
        <strong>${item.name}</strong>
        <span>${formatCurrency(item.price)}</span>
        <small>Qtd: ${item.quantity}</small>
      </div>
      <div class="qty-controls">
        <button type="button" data-action="decrease" data-product-id="${item.id}">-</button>
        <button type="button" data-action="increase" data-product-id="${item.id}">+</button>
      </div>
    </div>
  `).join('');

  cartItems.querySelectorAll('[data-action]').forEach((button) => {
    const action = button.getAttribute('data-action');
    const productId = button.getAttribute('data-product-id');
    button.addEventListener('click', () => {
      if (action === 'increase') increaseItem(productId);
      if (action === 'decrease') decreaseItem(productId);
    });
  });
}

function addToCart(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;

  const existing = state.cart.find((item) => item.id === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    state.cart.push({ ...product, quantity: 1 });
  }

  saveJson(CART_KEY, state.cart);
  renderCatalog();
}

function increaseItem(productId) {
  const item = state.cart.find((entry) => entry.id === productId);
  if (!item) return;
  item.quantity += 1;
  saveJson(CART_KEY, state.cart);
  renderCatalog();
}

function decreaseItem(productId) {
  const index = state.cart.findIndex((entry) => entry.id === productId);
  if (index === -1) return;

  if (state.cart[index].quantity > 1) {
    state.cart[index].quantity -= 1;
  } else {
    state.cart.splice(index, 1);
  }

  saveJson(CART_KEY, state.cart);
  renderCatalog();
}

function openSecretModal(mode) {
  const modal = document.getElementById('secretModal');
  const form = document.getElementById('secretForm');
  const input = document.getElementById('secretPassword');
  const title = document.getElementById('secretTitle');

  if (!modal || !form || !input || !title) return;

  modal.dataset.mode = mode;
  title.textContent = mode === 'settings' ? 'Configurações protegidas' : 'Painel de gestão';
  form.reset();
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => input.focus(), 50);
}

function closeSecretModal() {
  const modal = document.getElementById('secretModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  document.getElementById('secretForm')?.reset();
}

function openSecurePanel() {
  openSecretModal('admin');
}

function openSettingsPanel() {
  openSecretModal('settings');
}

function closeAdmin() {
  showView('home');
}

function handleSecretSubmit(event) {
  event.preventDefault();
  const modal = document.getElementById('secretModal');
  const input = document.getElementById('secretPassword');
  if (!modal || !input) return;

  const password = String(input.value || '').trim();
  if (!password) {
    alert('Digite a senha para continuar.');
    return;
  }

  if (password === ADMIN_PASSWORD) {
    const mode = modal.dataset.mode || 'admin';
    closeSecretModal();
    showView(mode === 'settings' ? 'settings' : 'admin');
  } else {
    alert('Senha incorreta.');
    input.value = '';
    input.focus();
  }
}

function bindShortcuts() {
  document.addEventListener('keydown', (event) => {
    if (!event.ctrlKey) return;
    const key = event.key.toLowerCase();

    if (key === 'g') {
      event.preventDefault();
      openSecurePanel();
    }

    if (key === 'c') {
      event.preventDefault();
      openSettingsPanel();
    }
  });
}

function getCustomerProfile(phone) {
  const key = getCustomerKey(phone);
  return state.clients[key] || null;
}

function togglePaymentExtras() {
  const paymentMethod = document.getElementById('paymentMethod');
  const changeFieldWrap = document.getElementById('changeFieldWrap');
  const changeInput = document.getElementById('changeForDelivery');

  if (!paymentMethod || !changeFieldWrap || !changeInput) return;

  const isDinheiro = paymentMethod.value === 'dinheiro';
  changeFieldWrap.classList.toggle('hidden', !isDinheiro);

  if (!isDinheiro) {
    changeInput.value = '';
    return;
  }

  changeInput.focus();
}

function openCheckoutModal() {
  if (!state.cart.length) {
    alert('Adicione pelo menos 1 item antes de finalizar.');
    return;
  }

  const modal = document.getElementById('checkoutModal');
  if (!modal) return;

  const phoneField = document.getElementById('customerPhone');
  const nameField = document.getElementById('customerName');
  const addressField = document.getElementById('customerAddress');
  const neighborhoodField = document.getElementById('customerNeighborhood');
  const notesField = document.getElementById('customerNotes');

  const existing = getCustomerProfile(phoneField?.value || '');
  if (existing) {
    nameField.value = existing.name || '';
    addressField.value = existing.address || '';
    neighborhoodField.value = existing.neighborhood || '';
    notesField.value = existing.notes || '';
  }

  if (document.getElementById('paymentMethod')) {
    document.getElementById('paymentMethod').value = 'pix';
  }

  togglePaymentExtras();
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  setTimeout(() => document.getElementById('customerName')?.focus(), 50);
}

function closeCheckoutModal() {
  const modal = document.getElementById('checkoutModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  document.getElementById('checkoutForm')?.reset();

  const paymentMethod = document.getElementById('paymentMethod');
  if (paymentMethod) {
    paymentMethod.value = 'pix';
  }

  togglePaymentExtras();
}

function collectCustomer() {
  const form = document.getElementById('checkoutForm');
  if (!form) return null;

  const formData = new FormData(form);
  const paymentMethod = String(formData.get('paymentMethod') || 'pix').trim();
  const changeForDelivery = Number(String(formData.get('changeForDelivery') || '').replace(',', '.')) || 0;

  const customer = {
    name: String(formData.get('name') || '').trim(),
    phone: String(formData.get('phone') || '').trim(),
    address: String(formData.get('address') || '').trim(),
    houseNumber: String(formData.get('houseNumber') || '').trim(),
    neighborhood: String(formData.get('neighborhood') || '').trim(),
    reference: String(formData.get('reference') || '').trim(),
    deliveryType: String(formData.get('deliveryType') || 'retirada'),
    paymentMethod,
    changeForDelivery: paymentMethod === 'dinheiro' ? changeForDelivery : 0,
    notes: String(formData.get('notes') || '').trim(),
  };

  if (!customer.name || !customer.phone || !customer.address || !customer.houseNumber || !customer.neighborhood) {
    alert('Preencha nome, celular, endereço, número e bairro para continuar.');
    return null;
  }

  const fullAddress = `${customer.address}, ${customer.houseNumber}`;
  const payload = {
    ...customer,
    address: fullAddress,
  };

  saveCustomer(payload);
  return payload;
}

function notifyWhatsApp(order) {
  const itemText = order.items.map((item) => `${item.name} x${item.quantity}`).join(', ');
  const trocoText = order.customer.paymentMethod === 'dinheiro' && Number(order.customer.changeForDelivery || 0) > 0
    ? `\nTroco para entregador: ${formatCurrency(order.customer.changeForDelivery)}`
    : '';
  const message = encodeURIComponent(
    `Novo pedido Central Gás\nCliente: ${order.customer.name}\nCelular: ${order.customer.phone}\nTipo: ${order.customer.deliveryType === 'entrega' ? 'Entrega' : 'Retirada'}\nForma de pagamento: ${order.customer.paymentMethod === 'pix' ? 'Via Pix' : order.customer.paymentMethod === 'cartao' ? 'Cartão' : order.customer.paymentMethod === 'nota' ? 'Nota' : 'Dinheiro'}${trocoText}\nEndereço: ${order.customer.address || 'N/A'}\nBairro: ${order.customer.neighborhood || 'N/A'}\nReferência: ${order.customer.reference || 'N/A'}\nItens: ${itemText}\nTotal: ${formatCurrency(order.total)}\nData: ${new Date(order.createdAt).toLocaleDateString('pt-BR')} ${new Date(order.createdAt).toLocaleTimeString('pt-BR')}`
  );

  window.open(`https://wa.me/5566996123459?text=${message}`, '_blank');
}

function finalizeOrder() {
  if (!state.cart.length) {
    alert('Adicione pelo menos 1 item antes de finalizar.');
    return;
  }

  const customer = collectCustomer();
  if (!customer) return;

  const order = {
    id: `order-${Date.now()}`,
    createdAt: new Date().toISOString(),
    customer: {
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      neighborhood: customer.neighborhood,
      reference: customer.reference,
      deliveryType: customer.deliveryType,
      paymentMethod: customer.paymentMethod,
      changeForDelivery: customer.changeForDelivery,
      notes: customer.notes,
    },
    items: state.cart.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: Number(item.price || 0),
    })),
    total: state.cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
  };

  state.orders.unshift(order);
  saveJson(ORDERS_KEY, state.orders);

  state.cart = [];
  saveJson(CART_KEY, state.cart);

  closeCheckoutModal();
  renderCatalog();
  renderAdmin();
  notifyWhatsApp(order);
  alert('Pedido registrado com sucesso!');
}

function renderAdmin() {
  const tbody = document.getElementById('adminTableBody');
  const statTotal = document.getElementById('statTotalProducts');
  const statMissing = document.getElementById('statMissingPrice');
  const statActive = document.getElementById('statActiveProducts');

  if (!tbody) return;

  tbody.innerHTML = state.products.map((product) => `
    <tr>
      <td>${product.name}</td>
      <td>${product.category}</td>
      <td>${product.stock}</td>
      <td>${formatCurrency(product.price)}</td>
      <td>
        <span class="status-pill ${product.active === false ? 'status-inactive' : 'status-active'}">
          ${product.active === false ? 'Inativo' : 'Ativo'}
        </span>
      </td>
      <td>
        <button class="table-action" type="button" data-action="edit" data-id="${product.id}">Editar</button>
        <button class="table-action delete" type="button" data-action="delete" data-id="${product.id}">Excluir</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-action]').forEach((button) => {
    const action = button.getAttribute('data-action');
    const id = button.getAttribute('data-id');
    button.addEventListener('click', () => {
      if (action === 'edit') editProduct(id);
      if (action === 'delete') deleteProduct(id);
    });
  });

  statTotal.textContent = state.products.length;
  statMissing.textContent = state.products.filter((item) => Number(item.price || 0) === 0).length;
  statActive.textContent = state.products.filter((item) => item.active !== false).length;

  renderHistory();
  renderMonthlyReport();
}

function renderHistory() {
  const historyList = document.getElementById('historyList');
  if (!historyList) return;

  if (!state.orders.length) {
    historyList.innerHTML = '<div class="empty-cart">Nenhum pedido registrado ainda.</div>';
    return;
  }

  historyList.innerHTML = state.orders.map((order) => {
    const customerPhone = getCustomerKey(order.customer?.phone || '');
    const previous = state.orders
      .filter((entry) => getCustomerKey(entry.customer?.phone || '') === customerPhone && entry.id !== order.id)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    const last = previous[0];
    const diffDays = last ? Math.round((new Date(order.createdAt) - new Date(last.createdAt)) / 86400000) : 0;

    return `
      <div class="history-item">
        <div class="history-main">
          <strong>${order.customer?.name || 'Cliente'}</strong>
          <span>${order.customer?.phone || 'Sem celular'}</span>
          <small>${last ? `Recorrência: ${diffDays} dias` : 'Primeira compra'}</small>
        </div>
        <div class="history-main">
          <strong>${formatCurrency(order.total)}</strong>
          <small>${new Date(order.createdAt).toLocaleDateString('pt-BR')}</small>
        </div>
      </div>
    `;
  }).join('');
}

function renderMonthlyReport() {
  const productRows = document.getElementById('reportProductRows');
  if (!productRows) return;

  const salesByProduct = state.movements
    .filter((item) => item.type === 'sale')
    .reduce((acc, item) => {
      const label = item.description || 'Venda';
      acc[label] = (acc[label] || 0) + Number(item.amount || 0);
      return acc;
    }, {});

  const entryAssignments = {
    'debito-caixa': 0,
    'credito-caixa': 0,
    'pix-caixa': 0,
    'cartao-povo': 0,
    'debito-sicred': 0,
    'credito-sicred': 0,
    'pix-sicred': 0,
    'nota': 0,
    'dinheiro': 0,
    'faturamento-total': 0,
  };

  const resultAssignments = {
    plantao: 0,
    retiradas: 0,
    entregador1: 0,
    entregador2: 0,
  };

  state.movements
    .filter((item) => item.type === 'sale')
    .forEach((item) => {
      const category = String(item.category || '').trim().toLowerCase();
      const keyMap = {
        loja: 'debito-caixa',
        balcão: 'dinheiro',
        entrega: 'pix-caixa',
        outros: 'cartao-povo',
      };
      const normalized = keyMap[category] || 'debito-caixa';
      entryAssignments[normalized] += Number(item.amount || 0);
      entryAssignments['faturamento-total'] += Number(item.amount || 0);
    });

  (state.report?.entries || []).forEach((item) => {
    const category = String(item.category || '').trim().toLowerCase();
    const map = {
      'debito caixa': 'debito-caixa',
      'debito-caixa': 'debito-caixa',
      'credito caixa': 'credito-caixa',
      'credito-caixa': 'credito-caixa',
      'pix caixa': 'pix-caixa',
      'pix-caixa': 'pix-caixa',
      'cartão do povo': 'cartao-povo',
      'cartao do povo': 'cartao-povo',
      'cartao-povo': 'cartao-povo',
      'debito sicred': 'debito-sicred',
      'debito-sicred': 'debito-sicred',
      'credito sicred': 'credito-sicred',
      'credito-sicred': 'credito-sicred',
      'pix sicred': 'pix-sicred',
      'pix-sicred': 'pix-sicred',
      'nota': 'nota',
      'dinheiro': 'dinheiro',
    };
    const normalized = map[category] || category;
    if (Object.hasOwn(entryAssignments, normalized)) {
      entryAssignments[normalized] += Number(item.amount || 0);
      entryAssignments['faturamento-total'] += Number(item.amount || 0);
    }
  });

  (state.report?.results || []).forEach((item) => {
    const category = String(item.category || '').trim().toLowerCase();
    const map = {
      plantao: 'plantao',
      retirada: 'retiradas',
      retiradas: 'retiradas',
      'entregador 1': 'entregador1',
      'entregador1': 'entregador1',
      'entregador 2': 'entregador2',
      'entregador2': 'entregador2',
    };
    const normalized = map[category] || category;
    if (Object.hasOwn(resultAssignments, normalized)) {
      resultAssignments[normalized] += Number(item.amount || 0);
    }
  });

  Object.entries(entryAssignments).forEach(([key, value]) => {
    const row = document.querySelector(`[data-report-entry="${key}"]`);
    if (row) {
      const amount = row.querySelector('span:last-child');
      if (amount) amount.textContent = formatCurrency(value);
    }
  });

  Object.entries(resultAssignments).forEach(([key, value]) => {
    const elementId = {
      plantao: 'reportPlantaoValue',
      retiradas: 'reportRetiradasValue',
      entregador1: 'reportEntregador1Value',
      entregador2: 'reportEntregador2Value',
    }[key];
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = formatCurrency(value);
    }
  });

  const expenseTotal = state.movements
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const manualExitTotal = (state.report?.exits || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalManualEntries = Object.values(entryAssignments).reduce((sum, value) => sum + value, 0);
  const totalResults = Object.values(resultAssignments).reduce((sum, value) => sum + value, 0);
  const finalBalance = totalManualEntries + totalResults - expenseTotal - manualExitTotal;

  document.getElementById('reportSaidasValue')?.replaceChildren(document.createTextNode(formatCurrency(expenseTotal + manualExitTotal)));
  document.getElementById('reportSaldoFinalValue')?.replaceChildren(document.createTextNode(formatCurrency(finalBalance)));

  const productEntries = Object.entries(salesByProduct);
  if (!productEntries.length) {
    productRows.innerHTML = '<div class="report-row empty-report-row"><span>SEM VENDAS</span><span>R$ 0,00</span></div>';
    return;
  }

  productRows.innerHTML = productEntries.map(([name, amount]) => `
    <div class="report-row">
      <span>${name}</span>
      <span>${formatCurrency(amount)}</span>
    </div>
  `).join('');
}

function renderFinanceDashboard() {
  const salesTotal = document.getElementById('financeSalesTotal');
  const expensesTotal = document.getElementById('financeExpensesTotal');
  const balanceTotal = document.getElementById('financeBalanceTotal');
  const salesCount = document.getElementById('financeSalesCount');
  const movementRows = document.getElementById('movementTableBody');

  if (!salesTotal || !expensesTotal || !balanceTotal || !salesCount || !movementRows) return;

  const sales = state.movements
    .filter((item) => item.type === 'sale')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const expenses = state.movements
    .filter((item) => item.type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const balance = sales - expenses;

  salesTotal.textContent = formatCurrency(sales);
  expensesTotal.textContent = formatCurrency(expenses);
  balanceTotal.textContent = formatCurrency(balance);
  balanceTotal.classList.toggle('negative', balance < 0);
  salesCount.textContent = `${state.movements.filter((item) => item.type === 'sale').length} venda(s)`;

  renderMonthlyReport();

  const rows = [...state.movements]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 12);

  if (!rows.length) {
    movementRows.innerHTML = '<tr><td colspan="5" class="empty-table">Nenhuma movimentação registrada.</td></tr>';
    return;
  }

  movementRows.innerHTML = rows.map((item) => `
    <tr>
      <td>${item.type === 'sale' ? 'Venda' : 'Gasto'}</td>
      <td>${item.description || 'Sem descrição'}</td>
      <td>${item.category || '-'}</td>
      <td class="money-${item.type === 'sale' ? 'positive' : 'negative'}">${formatCurrency(item.amount || 0)}</td>
      <td>${new Date(item.createdAt).toLocaleDateString('pt-BR')}</td>
    </tr>
  `).join('');
}

function addMovement(type, payload) {
  const amount = Number(payload.amount || 0);
  if (!amount || amount <= 0) {
    alert('Informe um valor válido.');
    return;
  }

  state.movements.push({
    id: `mov-${Date.now()}`,
    type,
    description: String(payload.description || '').trim() || (type === 'sale' ? 'Venda na loja' : 'Gasto do caixa'),
    category: String(payload.category || '').trim() || (type === 'sale' ? 'Loja' : 'Operação'),
    amount,
    createdAt: new Date().toISOString(),
  });

  saveMovements();
  renderFinanceDashboard();
  renderAdmin();
}

function handleSaleSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const description = form.querySelector('#saleDescription')?.value || '';
  const amount = form.querySelector('#saleValue')?.value || 0;
  const category = form.querySelector('#saleOrigin')?.value || 'Loja';

  addMovement('sale', {
    description,
    amount,
    category,
  });

  form.reset();
}

function handleExpenseSubmit(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const description = form.querySelector('#expenseDescription')?.value || '';
  const amount = form.querySelector('#expenseValue')?.value || 0;
  const category = form.querySelector('#expenseCategory')?.value || 'Operação';

  addMovement('expense', {
    description,
    amount,
    category,
  });

  form.reset();
}

function resetForm() {
  document.getElementById('productName').value = '';
  document.getElementById('productCategory').value = '';
  document.getElementById('productStock').value = '0';
  document.getElementById('productPrice').value = '0';
}

function saveProduct() {
  const name = document.getElementById('productName').value.trim();
  const category = document.getElementById('productCategory').value.trim();
  const stock = Number(document.getElementById('productStock').value || 0);
  const price = Number(document.getElementById('productPrice').value || 0);

  if (!name) {
    alert('Informe o nome do produto.');
    return;
  }

  const existing = state.products.find((item) => item.name.toLowerCase() === name.toLowerCase());

  if (existing) {
    existing.category = category || existing.category;
    existing.stock = stock;
    existing.price = price;
    existing.active = true;
  } else {
    state.products.push({
      id: `prod-${Date.now()}`,
      name,
      category: category || 'Gás',
      stock,
      price,
      active: true,
    });
  }

  saveJson(STORAGE_KEY, state.products);
  renderCatalog();
  renderAdmin();
  resetForm();
}

function deleteProduct(id) {
  state.products = state.products.filter((item) => item.id !== id);
  saveJson(STORAGE_KEY, state.products);
  renderCatalog();
  renderAdmin();
}

function editProduct(id) {
  const product = state.products.find((item) => item.id === id);
  if (!product) return;

  document.getElementById('productName').value = product.name;
  document.getElementById('productCategory').value = product.category;
  document.getElementById('productStock').value = product.stock;
  document.getElementById('productPrice').value = product.price;
}

function bindEvents() {
  document.getElementById('btnClientOrder')?.addEventListener('click', () => showView('catalog'));
  document.getElementById('btnBackHome')?.addEventListener('click', () => showView('home'));
  document.getElementById('btnBackHomeSettings')?.addEventListener('click', () => showView('home'));
  document.getElementById('btnHomeTop')?.addEventListener('click', () => showView('home'));
  document.getElementById('btnOpenAdmin')?.addEventListener('click', openSecurePanel);
  document.getElementById('btnAdminSecret')?.addEventListener('click', openSecurePanel);
  document.getElementById('btnConfigSecret')?.addEventListener('click', openSettingsPanel);
  document.getElementById('btnLogoutAdmin')?.addEventListener('click', closeAdmin);
  document.getElementById('btnSaveProduct')?.addEventListener('click', saveProduct);
  document.getElementById('btnResetForm')?.addEventListener('click', resetForm);
  document.getElementById('btnFinalizeOrder')?.addEventListener('click', openCheckoutModal);
  document.getElementById('btnCancelCheckout')?.addEventListener('click', closeCheckoutModal);
  document.getElementById('btnCloseCheckout')?.addEventListener('click', closeCheckoutModal);
  document.getElementById('paymentMethod')?.addEventListener('change', togglePaymentExtras);
  document.getElementById('btnCancelSecret')?.addEventListener('click', closeSecretModal);
  document.getElementById('btnCloseSecret')?.addEventListener('click', closeSecretModal);
  document.getElementById('secretForm')?.addEventListener('submit', handleSecretSubmit);
  document.getElementById('checkoutForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    finalizeOrder();
  });
  document.getElementById('btnSaveSettings')?.addEventListener('click', () => {
    alert('Configurações salvas com sucesso.');
  });
  document.getElementById('saleForm')?.addEventListener('submit', handleSaleSubmit);
  document.getElementById('expenseForm')?.addEventListener('submit', handleExpenseSubmit);
  document.getElementById('reportManualForm')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const type = form.querySelector('#reportManualType')?.value || 'entry';
    const category = form.querySelector('#reportManualCategory')?.value || '';
    const amount = form.querySelector('#reportManualValue')?.value || 0;
    const description = form.querySelector('#reportManualDescription')?.value || '';

    addReportEntry(type, category, amount, description);
    form.reset();
    if (type === 'entry') form.querySelector('#reportManualCategory').value = 'debito-caixa';
    if (type === 'exit') form.querySelector('#reportManualCategory').value = 'retirada';
    if (type === 'result') form.querySelector('#reportManualCategory').value = 'plantao';
  });
  document.getElementById('reportManualType')?.addEventListener('change', updateReportManualOptions);

  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      state.products = loadProducts();
      renderCatalog();
      renderAdmin();
    }
    if (event.key === ORDERS_KEY) {
      state.orders = loadOrders();
      renderHistory();
    }
    if (event.key === FINANCE_KEY) {
      state.movements = loadMovements();
      renderFinanceDashboard();
      renderAdmin();
    }
  });
}

function updateReportManualOptions() {
  const type = document.getElementById('reportManualType')?.value || 'entry';
  const categoryField = document.getElementById('reportManualCategory');
  if (!categoryField) return;

  const options = {
    entry: [
      ['Debito Caixa', 'debito-caixa'],
      ['Credito Caixa', 'credito-caixa'],
      ['Pix Caixa', 'pix-caixa'],
      ['Cartão do Povo', 'cartao-povo'],
      ['Debito Sicred', 'debito-sicred'],
      ['Credito Sicred', 'credito-sicred'],
      ['Pix Sicred', 'pix-sicred'],
      ['Nota', 'nota'],
      ['Dinheiro', 'dinheiro'],
    ],
    exit: [
      ['Retirada', 'retirada'],
      ['Gasto Operacional', 'gasto-operacional'],
      ['Compra', 'compra'],
    ],
    result: [
      ['Plantão', 'plantao'],
      ['Retiradas', 'retiradas'],
      ['Entregador 1', 'entregador1'],
      ['Entregador 2', 'entregador2'],
    ],
  };

  const list = options[type] || options.entry;
  categoryField.innerHTML = list.map(([label, value]) => `<option value="${value}">${label}</option>`).join('');

/* ============================================================
   CENTRAL GÁS — ponte com a API compartilhada
   Mantém a interface original e adiciona persistência no banco.
   ============================================================ */
const CG_API_BASE = 'https://central-gas-api-free.onrender.com/api';
const CG_TOKEN_KEY = 'central_gas_admin_token';
const CG_CUSTOMER_KEY = 'central_gas_customer_profile_v2';

function cgToken() { return localStorage.getItem(CG_TOKEN_KEY) || ''; }

async function cgApi(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  const token = cgToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  const response = await fetch(CG_API_BASE + path, { ...options, headers });
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) throw Object.assign(new Error(data?.erro || data?.message || 'Erro na API'), { status: response.status });
  return data;
}

function cgNormalizeProduct(p) {
  return {
    ...p,
    id: p.id,
    name: p.name ?? p.nome ?? '',
    category: p.category ?? p.categoria ?? 'Gás',
    price: Number(p.price ?? p.preco_entrega ?? 0),
    priceDelivery: Number(p.priceDelivery ?? p.preco_entrega ?? 0),
    pricePickup: Number(p.pricePickup ?? p.preco_retirada ?? p.preco_entrega ?? 0),
    stock: Number(p.stock ?? p.quantidade_atual ?? 0),
    active: p.active ?? p.ativo ?? true,
  };
}

async function cgSyncProducts() {
  try {
    const data = await cgApi('/produtos?ativos=false');
    state.products = (Array.isArray(data) ? data : []).map(cgNormalizeProduct);
    saveJson(STORAGE_KEY, state.products);
    return true;
  } catch (e) {
    console.warn('Central Gás: sincronização de produtos indisponível.', e);
    return false;
  }
}

function cgSaveCustomerProfile(customer) {
  if (!customer?.phone) return;
  localStorage.setItem(CG_CUSTOMER_KEY, JSON.stringify({ ...customer, savedAt: new Date().toISOString() }));
}

function cgLoadCustomerProfile() {
  try {
    const raw = localStorage.getItem(CG_CUSTOMER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function cgLoadCustomerByPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 10) return null;
  try {
    return await cgApi('/clientes/telefone/' + encodeURIComponent(digits));
  } catch { return null; }
}

async function openCheckoutModal() {
  if (!state.cart.length) {
    alert('Adicione pelo menos 1 item antes de finalizar.');
    return;
  }
  const modal = document.getElementById('checkoutModal');
  if (!modal) return;
  const profile = cgLoadCustomerProfile();
  const phone = document.getElementById('customerPhone');
  const name = document.getElementById('customerName');
  const address = document.getElementById('customerAddress');
  const number = document.getElementById('customerHouseNumber');
  const neighborhood = document.getElementById('customerNeighborhood');
  const reference = document.getElementById('customerReference');
  const notes = document.getElementById('customerNotes');
  const delivery = document.getElementById('deliveryType');

  if (profile) {
    phone.value = profile.phone || '';
    name.value = profile.name || '';
    address.value = profile.address || '';
    number.value = profile.houseNumber || '';
    neighborhood.value = profile.neighborhood || '';
    reference.value = profile.reference || '';
    notes.value = profile.notes || '';
    if (profile.deliveryType) delivery.value = profile.deliveryType;
  }

  if (phone.value) {
    const server = await cgLoadCustomerByPhone(phone.value);
    if (server) {
      name.value = server.nome || name.value;
      phone.value = server.telefone || phone.value;
      const savedAddress = server.endereco || '';
      if (savedAddress) {
        const match = savedAddress.match(/^(.*?)(?:,\s*)(\d+[A-Za-z]?)$/);
        if (match) {
          address.value = match[1];
          number.value = match[2];
        } else {
          address.value = savedAddress;
        }
      }
    }
  }

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  togglePaymentExtras();
  setTimeout(() => (name.value ? phone : name)?.focus(), 50);
}

async function finalizeOrder() {
  if (!state.cart.length) return alert('Adicione pelo menos 1 item antes de finalizar.');
  const customer = collectCustomer();
  if (!customer) return;

  try {
    const result = await cgApi('/pedidos', {
      method: 'POST',
      body: JSON.stringify({
        cliente: {
          nome: customer.name,
          telefone: customer.phone,
          email: customer.email || null,
          endereco: customer.address,
          tipo_padrao: customer.deliveryType,
        },
        tipo_entrega: customer.deliveryType,
        itens: state.cart.map(item => ({ produto_id: Number(item.id), quantidade: Number(item.quantity || 0) })),
        observacoes: [customer.notes, customer.reference ? 'Referência: ' + customer.reference : ''].filter(Boolean).join(' | ') || null,
      }),
    });

    cgSaveCustomerProfile(customer);
    saveCustomer(customer);
    state.orders.unshift({
      id: result.id,
      createdAt: result.data_pedido || result.criado_em || new Date().toISOString(),
      customer,
      items: (result.itens || state.cart).map(item => ({
        id: item.produto_id || item.id,
        name: item.produto_nome || item.nome || item.name || 'Produto',
        quantity: Number(item.quantidade || item.quantity || 0),
        price: Number(item.preco_unitario || item.price || 0),
      })),
      total: Number(result.total || 0),
      status: result.status || 'pendente',
    });
    saveJson(ORDERS_KEY, state.orders);
    state.cart = [];
    saveJson(CART_KEY, state.cart);
    closeCheckoutModal();
    await cgSyncProducts();
    renderCatalog();
    renderAdmin();
    notifyWhatsApp(state.orders[0]);
    alert('Pedido registrado com sucesso! Seus dados ficaram salvos para o próximo pedido.');
  } catch (e) {
    console.error(e);
    alert(e?.message || 'Não foi possível registrar o pedido no servidor.');
  }
}

async function handleSecretSubmit(event) {
  event.preventDefault();
  const modal = document.getElementById('secretModal');
  const input = document.getElementById('secretPassword');
  if (!modal || !input) return;
  try {
    const result = await cgApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@centralgas.com', senha: input.value }),
    });
    localStorage.setItem(CG_TOKEN_KEY, result.token);
    const mode = modal.dataset.mode || 'admin';
    closeSecretModal();
    await cgSyncProducts();
    showView(mode === 'settings' ? 'settings' : 'admin');
    if (mode === 'admin') await cgSyncAdminData();
  } catch (e) {
    alert(e?.status === 401 ? 'Senha incorreta.' : 'Não foi possível conectar ao servidor de gestão.');
    input.value = '';
    input.focus();
  }
}

async function cgSyncAdminData() {
  if (!cgToken()) return;
  try {
    const orders = await cgApi('/pedidos?limite=200');
    state.orders = (Array.isArray(orders) ? orders : []).map(row => ({
      id: row.id,
      createdAt: row.data_pedido || row.criado_em || new Date().toISOString(),
      customer: {
        name: row.cliente_nome || 'Cliente',
        phone: row.cliente_telefone || '',
        address: row.cliente_endereco || '',
        deliveryType: row.tipo_entrega || 'entrega',
        notes: row.observacoes || '',
      },
      items: row.itens || [],
      total: Number(row.total || 0),
      status: row.status || 'pendente',
    }));
    saveJson(ORDERS_KEY, state.orders);
  } catch {}
  try {
    const date = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    const data = await cgApi('/caixa?data=' + date);
    state.movements = (data.movimentacoes || []).map(item => ({
      id: item.id,
      type: item.tipo === 'entrada' ? 'sale' : 'expense',
      description: item.descricao || item.categoria || 'Movimentação',
      category: item.categoria || '',
      amount: Number(item.valor || 0),
      createdAt: item.criado_em || new Date().toISOString(),
    }));
    saveMovements();
  } catch {}
}

async function saveProduct() {
  const name = document.getElementById('productName')?.value.trim();
  const category = document.getElementById('productCategory')?.value.trim() || 'Gás';
  const stock = Number(document.getElementById('productStock')?.value || 0);
  const price = Number(document.getElementById('productPrice')?.value || 0);
  if (!name || price <= 0 || stock < 0) return alert('Informe nome, preço e estoque válidos.');

  const id = window.__centralGasEditingProductId;
  const body = { nome: name, categoria: category, preco_entrega: price, preco_retirada: price, estoque: stock, descricao: '' };

  try {
    if (id) {
      await cgApi('/produtos/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await cgApi('/produtos', { method: 'POST', body: JSON.stringify(body) });
    }
    window.__centralGasEditingProductId = null;
    await cgSyncProducts();
    renderCatalog();
    renderAdmin();
    resetForm();
  } catch (e) {
    alert(e?.message || 'Não foi possível salvar o produto.');
  }
}

async function editProduct(id) {
  const product = state.products.find(item => String(item.id) === String(id));
  if (!product) return;
  window.__centralGasEditingProductId = id;
  document.getElementById('productName').value = product.name || '';
  document.getElementById('productCategory').value = product.category || '';
  document.getElementById('productStock').value = product.stock ?? 0;
  document.getElementById('productPrice').value = product.priceDelivery ?? product.price ?? 0;
}

async function deleteProduct(id) {
  if (!confirm('Desativar este produto do catálogo?')) return;
  try {
    await cgApi('/produtos/' + encodeURIComponent(id), { method: 'PUT', body: JSON.stringify({ ativo: false }) });
    await cgSyncProducts();
    renderCatalog();
    renderAdmin();
  } catch (e) {
    alert(e?.message || 'Não foi possível desativar o produto.');
  }
}

async function addMovement(type, payload) {
  const amount = Number(payload.amount || 0);
  if (!amount || amount <= 0) return alert('Informe um valor válido.');
  try {
    await cgApi('/caixa', {
      method: 'POST',
      body: JSON.stringify({
        tipo: type === 'sale' ? 'entrada' : 'saida',
        categoria: String(payload.category || '').trim() || (type === 'sale' ? 'Loja' : 'Operação'),
        descricao: String(payload.description || '').trim() || null,
        valor: amount,
      }),
    });
    await cgSyncAdminData();
    renderFinanceDashboard();
    renderAdmin();
  } catch (e) {
    alert(e?.message || 'Não foi possível salvar a movimentação.');
  }
}

function collectCustomer() {
  const form = document.getElementById('checkoutForm');
  if (!form) return null;
  const data = new FormData(form);
  const customer = {
    name: String(data.get('name') || '').trim(),
    phone: String(data.get('phone') || '').trim(),
    email: String(data.get('email') || '').trim(),
    address: String(data.get('address') || '').trim(),
    houseNumber: String(data.get('houseNumber') || '').trim(),
    neighborhood: String(data.get('neighborhood') || '').trim(),
    reference: String(data.get('reference') || '').trim(),
    deliveryType: String(data.get('deliveryType') || 'retirada'),
    paymentMethod: String(data.get('paymentMethod') || 'pix'),
    changeForDelivery: Number(String(data.get('changeForDelivery') || '').replace(',', '.')) || 0,
    notes: String(data.get('notes') || '').trim(),
  };
  if (!customer.name || !customer.phone || !customer.address || !customer.houseNumber) {
    alert('Preencha nome, celular, endereço e número para continuar.');
    return null;
  }
  customer.address = customer.address + ', ' + customer.houseNumber;
  cgSaveCustomerProfile(customer);
  saveCustomer(customer);
  return customer;
}

function init() {
  updateReportManualOptions();
  bindEvents();
  bindShortcuts();
  applyStickyPanels();
  applyHeaderScrollBehavior();
  renderCatalog();
  renderAdmin();
  renderFinanceDashboard();
  showView('home');
  window.addEventListener('scroll', applyHeaderScrollBehavior, { passive: true });

  cgSyncProducts().then(() => {
    renderCatalog();
    renderAdmin();
  });
}

init();
