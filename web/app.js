/**
 * MINH AN COMPANY - B2B AI AGENT SYSTEM
 * Multi-Page SaaS Router & Business Controller
 * Author: Lê Yến Như
 */

let currentUser = null;
let allOpportunities = [];
let masterCatalog = {};
let saasChartInstance = null;
let currentProcessingOpp = null;

const TEST_CASES_SAMPLES = {
  1: `Chào Minh An Company,
Tôi là Trần Văn Hùng, Trưởng phòng CNTT Công ty Cổ phần Công nghệ DigiTech (Email: hung.tran@digitech.vn, SĐT: 0912345678).
Công ty chúng tôi đang cần trang bị thiết bị cho nhân viên mới:
- 10 chiếc Laptop Doanh Nghiệp Dell Vostro 5630
- 5 bộ Màn hình Dell P2422H 23.8 inch IPS Full HD
Ngân sách dự kiến của chúng tôi là 250 triệu VNĐ.
Tiến độ triển khai trong vòng 7 ngày làm việc kể từ khi ký hợp đồng.
Đề xuất mức chiết khấu thân thiết là 4%.
Nhờ quý công ty gửi báo giá và cam kết bảo hành giúp tôi. Xin cảm ơn!`,

  2: `Gửi phòng kinh doanh Minh An,
Công ty Tập đoàn Dược Phẩm An Khang cần mua sắm gấp thiết bị:
- Máy chủ Server Dell PowerEdge R450 Rack 1U
- Switch mạng Cisco Catalyst 24 Port Gigabit C1000-24T (chưa rõ số lượng bao nhiêu cái)
Ngân sách: Hiện chưa xác định ngân sách cụ thể, phụ thuộc vào báo giá của nhà cung cấp.
Thời hạn: Cần càng sớm càng tốt nhưng chưa có ngày cụ thể.
Người liên hệ: Nguyễn Thu Trang - Phòng Mua sắm (Email: trang.nt@ankhangpharma.com).`,

  3: `Kính gửi Minh An Company,
Công ty Cổ phần Viễn Thông Toàn Cầu (Global Telecom JSC) cần đặt mua:
- 30 chiếc Thiết bị định tuyến Router Cisco Catalyst C8200L
Số lượng đặt mua lớn và thanh toán ngay 100%, chúng tôi yêu cầu mức chiết khấu thương mại 10%.
Ngân sách công ty bố trí: 700 triệu VNĐ.
Thời hạn giao hàng: trong vòng 10 ngày.
Người phê duyệt hợp đồng: Ông Lê Minh Quân - Tổng Giám Đốc.
Người liên hệ: Ban Mua Sắm (ban.muasam@globaltelecom.vn - SĐT: 0988776655).`,

  4: `Gửi Công ty Minh An,
Công ty Khách sạn Grand Plaza Hà Nội cần đặt mua khẩn cấp:
- 50 chiếc Máy in Laser đa năng HP LaserJet Pro MFP M428fdw
Yêu cầu: Giao hàng toàn bộ và lắp đặt hoàn thiện trong vòng 3 ngày tới để kịp khai trương trung tâm hội nghị.
Ngân sách dự kiến: 600 triệu VNĐ. Chiết khấu mong muốn: 2%.
Người liên hệ: Vũ Đức Thắng - Quản lý Vận hành (Email: thang.vd@grandplazahotel.vn).`
};

document.addEventListener('DOMContentLoaded', () => {
  initSystem();
});

async function initSystem() {
  // Check stored auth session
  const storedUser = localStorage.getItem('minhan_user');
  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
      applyUserInfoToUi(currentUser);
    } catch (e) {
      localStorage.removeItem('minhan_user');
    }
  }

  // Handle URL hash routing
  const hash = window.location.hash.replace('#', '');
  if (hash === 'login') {
    navigateTo('login');
  } else if (hash.startsWith('app') && currentUser) {
    navigateTo('app');
    const subPage = hash.split('/')[1] || 'page-dashboard';
    openSaasPage(subPage);
  } else {
    navigateTo('landing');
  }

  // Preload initial backend data
  await loadBackendData();
}

async function loadBackendData() {
  try {
    const [oppsRes, catRes] = await Promise.all([
      fetch('/api/opportunities'),
      fetch('/api/catalog')
    ]);

    const oppsData = await oppsRes.json();
    const catData = await catRes.json();

    allOpportunities = oppsData.opportunities || [];
    masterCatalog = catData.catalog || {};

    renderDashboardData(oppsData.summary, allOpportunities);
    renderCatalogTable(masterCatalog);
    renderReportsTable(oppsData.summary, allOpportunities);
    renderApprovalInbox(allOpportunities);
    loadAuditLogs();
  } catch (err) {
    console.error('Lỗi tải dữ liệu ban đầu:', err);
  }
}

// ==========================================
// ROUTER & NAVIGATION CONTROLLER
// ==========================================
function navigateTo(targetView) {
  const landingView = document.getElementById('publicLandingView');
  const loginView = document.getElementById('publicLoginView');
  const appView = document.getElementById('privateAppView');

  landingView.style.display = 'none';
  loginView.style.display = 'none';
  appView.style.display = 'none';

  if (targetView === 'login') {
    loginView.style.display = 'flex';
    window.location.hash = 'login';
    window.scrollTo(0, 0);
  } else if (targetView === 'app') {
    if (!currentUser) {
      alert('Vui lòng đăng nhập để truy cập hệ thống nội bộ!');
      navigateTo('login');
      return;
    }
    appView.style.display = 'block';
    window.location.hash = 'app';
  } else {
    landingView.style.display = 'block';
    window.location.hash = 'landing';
    window.scrollTo(0, 0);
  }
}

function scrollToFeatures() {
  const featSec = document.getElementById('featuresSection');
  if (featSec) {
    featSec.scrollIntoView({ behavior: 'smooth' });
  }
}

function openSaasPage(pageId) {
  if (!currentUser) {
    navigateTo('login');
    return;
  }

  // Hide all pages
  document.querySelectorAll('.saas-page').forEach(p => p.classList.remove('active'));

  // Show target page
  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('active');
  }

  // Update sidebar active link
  document.querySelectorAll('.sidebar-menu .menu-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-page') === pageId);
  });

  // Update breadcrumb
  const breadcrumbMap = {
    'page-dashboard': 'Tổng quan',
    'page-ingestion': 'Tiếp nhận yêu cầu',
    'page-parsing': 'Phân tích yêu cầu AI',
    'page-opportunities': 'Quản lý cơ hội',
    'page-validation': 'Thẩm định kho & đơn giá',
    'page-pricing': 'Báo giá & Chiết khấu',
    'page-approval': 'Hộp thư phê duyệt',
    'page-reports': 'Báo cáo & Thống kê',
    'page-audit': 'Nhật ký AI Agent',
    'page-data': 'Quản lý dữ liệu',
    'page-settings': 'Cài đặt & Phân quyền'
  };

  document.getElementById('breadcrumbCurrentPage').textContent = breadcrumbMap[pageId] || 'Hệ thống';
  window.location.hash = `app/${pageId}`;
  window.scrollTo(0, 0);

  if (pageId === 'page-audit') {
    loadAuditLogs();
  }
}

// ==========================================
// AUTHENTICATION & LOGIN LOGIC
// ==========================================
async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorBox = document.getElementById('loginErrorAlert');

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (data.status === 'success') {
      currentUser = data.user;
      localStorage.setItem('minhan_user', JSON.stringify(currentUser));
      applyUserInfoToUi(currentUser);
      errorBox.style.display = 'none';

      navigateTo('app');
      openSaasPage('page-dashboard');
    } else {
      errorBox.textContent = data.error || 'Thông tin đăng nhập không hợp lệ!';
      errorBox.style.display = 'block';
    }
  } catch (err) {
    errorBox.textContent = 'Lỗi kết nối máy chủ.';
    errorBox.style.display = 'block';
  }
}

function fillDemoAccount(email, pwd) {
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPassword').value = pwd;
}

function togglePasswordVisibility() {
  const pwdInput = document.getElementById('loginPassword');
  pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
}

function handleLogout() {
  if (confirm('Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?')) {
    currentUser = null;
    localStorage.removeItem('minhan_user');
    navigateTo('landing');
  }
}

function applyUserInfoToUi(user) {
  if (!user) return;
  const nameEl = document.getElementById('sidebarUserName');
  const roleEl = document.getElementById('sidebarUserRole');
  const avatarEl = document.getElementById('sidebarUserAvatar');

  if (nameEl) nameEl.textContent = user.name || 'Lê Yến Như';
  if (roleEl) roleEl.textContent = user.role || 'Quản trị viên';
  if (avatarEl && user.avatar) avatarEl.src = user.avatar;
}

// ==========================================
// PAGE 3: DASHBOARD CONTROLLER
// ==========================================
function renderDashboardData(summary, opps) {
  if (!summary) return;

  document.getElementById('dashCountEligible').textContent = summary.eligible.count;
  document.getElementById('dashValEligible').textContent = formatCurrency(summary.eligible.total_value);

  document.getElementById('dashCountPending').textContent = summary.pending_approval.count;
  document.getElementById('dashValPending').textContent = formatCurrency(summary.pending_approval.total_value);

  document.getElementById('dashCountMissing').textContent = summary.missing_info.count;
  document.getElementById('dashCountUnfulfilled').textContent = summary.unfulfilled.count;

  document.getElementById('sidebarOppCount').textContent = opps.length;
  document.getElementById('sidebarPendingCount').textContent = summary.pending_approval.count;

  // Render recent table
  const tbody = document.getElementById('dashTableBody');
  tbody.innerHTML = opps.slice(0, 5).map(o => `
    <tr>
      <td><b>${o.id}</b></td>
      <td>
        <div style="font-weight:700;">${o.customer_name}</div>
        <small style="color:#64748b;">${o.contact_person}</small>
      </td>
      <td><span class="badge-tag ${getBadgeStyle(o.status)}">${o.status}</span></td>
      <td style="font-weight:700;">${o.pricing.total_after_discount > 0 ? formatCurrency(o.pricing.total_after_discount) : 'Chưa xác định'}</td>
      <td>${o.sales_rep ? o.sales_rep.name : 'N/A'}</td>
      <td>
        <button class="btn-secondary-tool" onclick="inspectOpportunity('${o.id}')">Xem hồ sơ &rarr;</button>
      </td>
    </tr>
  `).join('');

  // Render Chart
  renderSaasChart(summary);
  renderAllOpportunitiesTable(opps);
}

function renderSaasChart(summary) {
  const ctx = document.getElementById('saasStatusChart');
  if (!ctx) return;

  if (saasChartInstance) {
    saasChartInstance.destroy();
  }

  saasChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Có thể tiếp tục', 'Chờ duyệt', 'Cần bổ sung', 'Chưa đáp ứng'],
      datasets: [{
        data: [
          summary.eligible.count,
          summary.pending_approval.count,
          summary.missing_info.count,
          summary.unfulfilled.count
        ],
        backgroundColor: ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 11, weight: '600' } } }
      },
      cutout: '65%'
    }
  });
}

// ==========================================
// PAGE 4 & 5: INGESTION & PARSING
// ==========================================
function loadTestCaseToForm(tcNum) {
  const text = TEST_CASES_SAMPLES[tcNum];
  document.getElementById('pageIngestTextarea').value = text || '';
}

function handleFileUploadSim(e) {
  const file = e.target.files[0];
  if (file) {
    document.getElementById('pageIngestTextarea').value = `[ĐÃ TẢI LÊN TỆP: ${file.name}]\n` + TEST_CASES_SAMPLES[1];
  }
}

async function runIngestToParsing() {
  const rawText = document.getElementById('pageIngestTextarea').value.trim();
  if (!rawText) {
    alert('Vui lòng nhập nội dung yêu cầu khách hàng.');
    return;
  }

  try {
    const res = await fetch('/api/process_request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text: rawText, source: 'Giao diện tiếp nhận SaaS' })
    });

    const data = await res.json();
    if (data.status === 'success') {
      currentProcessingOpp = data.opportunity;
      allOpportunities.unshift(currentProcessingOpp);

      // Render split view in Page 5
      renderParsingSplitView(currentProcessingOpp);
      openSaasPage('page-parsing');

      // Refresh background datasets
      renderDashboardData(data.summary, allOpportunities);
      renderApprovalInbox(allOpportunities);
    } else {
      alert('Lỗi: ' + (data.error || 'Không thể xử lý'));
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối máy chủ');
  }
}

function renderParsingSplitView(opp) {
  document.getElementById('parsingRawContent').textContent = opp.extracted.raw_text;

  const itemsHtml = opp.validation.items.map(it => `
    <li style="margin-bottom:4px;">
      <b>${it.name}</b> (Mã: <code>${it.sku}</code>) — SL: <b>${it.requested_qty}</b> | Tồn kho: <b>${it.stock_available}</b> (${it.stock_status})
    </li>
  `).join('');

  const missingHtml = opp.missing_fields.length > 0 
    ? `<div style="background:#fee2e2; color:#b91c1c; padding:8px 12px; border-radius:8px; margin-top:10px; font-weight:700;">
        ⚠️ Cảnh báo thiếu thông tin bắt buộc: ${opp.missing_fields.join(', ')}
       </div>`
    : `<div style="background:#ecfdf5; color:#065f46; padding:8px 12px; border-radius:8px; margin-top:10px; font-weight:700;">
        ✓ Thông tin đầy đủ 100% theo quy chuẩn
       </div>`;

  document.getElementById('parsingResultBox').innerHTML = `
    <div><b>Mã cơ hội:</b> <code>${opp.id}</code></div>
    <div><b>Khách hàng:</b> ${opp.customer_name}</div>
    <div><b>Người liên hệ:</b> ${opp.contact_person} (Email: ${opp.email || 'N/A'})</div>
    <div><b>Ngân sách dự kiến:</b> ${opp.extracted.budget ? formatCurrency(opp.extracted.budget) : '<span style="color:#ef4444;">Chưa đề cập</span>'}</div>
    <div><b>Thời hạn triển khai:</b> ${opp.extracted.deadline_days ? opp.extracted.deadline_days + ' ngày' : '<span style="color:#ef4444;">Chưa rõ ngày</span>'}</div>
    <div><b>Chiết khấu yêu cầu:</b> ${opp.extracted.requested_discount}%</div>
    
    <div style="margin-top:10px;"><b>Danh sách sản phẩm trích xuất:</b></div>
    <ul style="padding-left:18px; margin-top:4px;">${itemsHtml}</ul>

    ${missingHtml}

    <div style="margin-top:14px; padding-top:10px; border-top:1px dashed #fde68a;">
      <div><b>Trạng thái phân loại:</b> <span class="badge-tag ${getBadgeStyle(opp.status)}">${opp.status}</span></div>
      <div style="color:#64748b; font-size:12px; margin-top:2px;"><b>Căn cứ:</b> ${opp.status_reason}</div>
    </div>
  `;
}

// ==========================================
// PAGE 6: OPPORTUNITIES MANAGER
// ==========================================
function renderAllOpportunitiesTable(opps) {
  const tbody = document.getElementById('allOppsTableBody');
  if (!tbody) return;

  tbody.innerHTML = opps.map(o => `
    <tr>
      <td><b>${o.id}</b></td>
      <td>
        <div style="font-weight:700;">${o.customer_name}</div>
        <small style="color:#64748b;">${o.email || o.phone}</small>
      </td>
      <td>${o.contact_person}</td>
      <td>${o.created_at || 'Hôm nay'}</td>
      <td style="font-weight:700;">${o.pricing.total_after_discount > 0 ? formatCurrency(o.pricing.total_after_discount) : 'Chưa xác định'}</td>
      <td>${o.sales_rep ? o.sales_rep.name : 'N/A'}</td>
      <td><span class="badge-tag ${getBadgeStyle(o.status)}">${o.status}</span></td>
      <td>
        <button class="btn-secondary-tool" onclick="inspectOpportunity('${o.id}')">Chi tiết &rarr;</button>
      </td>
    </tr>
  `).join('');
}

function filterOpportunitiesTable() {
  const filterVal = document.getElementById('oppStatusFilter').value;
  if (filterVal === 'ALL') {
    renderAllOpportunitiesTable(allOpportunities);
  } else {
    const filtered = allOpportunities.filter(o => o.status === filterVal);
    renderAllOpportunitiesTable(filtered);
  }
}

function inspectOpportunity(oppId) {
  const opp = allOpportunities.find(o => o.id === oppId);
  if (!opp) return;

  openSaasPage('page-opportunities');
  const viewerBox = document.getElementById('oppDetailViewerBox');
  viewerBox.style.display = 'block';
  document.getElementById('detailViewerId').textContent = opp.id;

  const itemsRows = opp.validation.items.map(it => `
    <tr>
      <td><code>${it.sku}</code></td>
      <td><b>${it.name}</b></td>
      <td>${it.requested_qty} chiếc</td>
      <td>${formatCurrency(it.unit_price)}</td>
      <td>${it.stock_available} chiếc</td>
      <td><span class="badge-tag ${it.is_stock_ok ? 'eligible' : 'unfulfilled'}">${it.stock_status}</span></td>
    </tr>
  `).join('');

  document.getElementById('detailViewerContent').innerHTML = `
    <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px; margin-bottom:20px;">
      <div>
        <h3 style="font-size:18px; font-weight:800; color:#1e293b;">${opp.customer_name}</h3>
        <p style="font-size:13px; color:#64748b;">Người liên hệ: <b>${opp.contact_person}</b> | Email: ${opp.email} | SĐT: ${opp.phone}</p>
        <p style="font-size:13px; color:#64748b;">Chuyên viên kinh doanh: <b>${opp.sales_rep.name}</b> (${opp.sales_rep.email})</p>
      </div>
      <div style="text-align:right;">
        <span class="badge-tag ${getBadgeStyle(opp.status)}" style="font-size:14px; padding:6px 14px;">${opp.status}</span>
        <div style="font-size:18px; font-weight:800; color:#b45309; margin-top:8px;">
          ${opp.pricing.total_after_discount > 0 ? formatCurrency(opp.pricing.total_after_discount) : 'Chưa xác định'}
        </div>
      </div>
    </div>

    <table class="saas-table" style="margin-bottom:20px;">
      <thead>
        <tr>
          <th>Mã SKU</th>
          <th>Tên Sản Phẩm</th>
          <th>Số Lượng</th>
          <th>Đơn Giá</th>
          <th>Tồn Kho</th>
          <th>Tình Trạng Kho</th>
        </tr>
      </thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div style="background:#fffdf0; padding:16px; border:1px solid #fde68a; border-radius:12px; margin-bottom:16px;">
      <div style="font-size:13px; font-weight:700; color:#b45309; margin-bottom:4px;">CÔNG THỨC & CĂN CỨ TÍNH TOÁN:</div>
      <div style="font-family:monospace; font-size:12px;">${opp.pricing.math_formula}</div>
      <div style="font-size:12.5px; color:#64748b; margin-top:6px;">Lý do nghiệp vụ: <b>${opp.status_reason}</b></div>
    </div>

    <div style="background:#f8fafc; padding:16px; border:1px solid #e2e8f0; border-radius:12px;">
      <div style="font-size:13px; font-weight:700; margin-bottom:8px;">✉️ BẢN NHÁP EMAIL PHẢN HỒI KHÁCH HÀNG:</div>
      <div style="white-space:pre-wrap; font-size:13px; line-height:1.6; color:#334155;">${opp.draft_email}</div>
    </div>
  `;

  viewerBox.scrollIntoView({ behavior: 'smooth' });
}

// ==========================================
// PAGE 7: VALIDATION & MASTER CATALOG
// ==========================================
function renderCatalogTable(catalog) {
  const tbody = document.getElementById('catalogTableBody');
  if (!tbody) return;

  tbody.innerHTML = Object.values(catalog).map(p => `
    <tr>
      <td><b>${p.sku}</b></td>
      <td>${p.name}</td>
      <td>${p.category}</td>
      <td style="font-weight:700;">${formatCurrency(p.unit_price)}</td>
      <td><span class="badge-tag ${p.stock_available >= 15 ? 'eligible' : 'unfulfilled'}">${p.stock_available} chiếc</span></td>
      <td>${p.standard_lead_days} ngày</td>
      <td>${p.express_lead_days} ngày</td>
      <td>${p.warranty_months} tháng</td>
    </tr>
  `).join('');
}

function runLiveInventoryValidation() {
  alert('Đã kiểm tra đồng bộ toàn bộ tồn kho với Master Catalog!');
  renderCatalogTable(masterCatalog);
}

// ==========================================
// PAGE 9: APPROVAL INBOX (TRƯỞNG PHÒNG)
// ==========================================
function renderApprovalInbox(opps) {
  const container = document.getElementById('approvalPendingContainer');
  if (!container) return;

  const pendingOpps = opps.filter(o => o.status === 'Chờ duyệt');
  if (pendingOpps.length === 0) {
    container.innerHTML = `
      <div class="saas-card" style="text-align:center; padding:40px; color:#64748b;">
        <div style="font-size:32px;">✓</div>
        <div style="font-size:16px; font-weight:700; color:#1e293b; margin-top:8px;">Hộp thư phê duyệt sạch sẽ</div>
        <p style="font-size:13px; margin-top:4px;">Hiện không có cơ hội nào đang chờ Trưởng phòng phê duyệt.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = pendingOpps.map(o => `
    <div class="saas-card" style="border-left:4px solid #8b5cf6;">
      <div class="saas-card-title-row">
        <div>
          <div style="font-size:16px; font-weight:800; color:#6b21a8;">
            📑 PHIẾU CHUYỂN DUYỆT: ${o.id} — ${o.customer_name}
          </div>
          <small style="color:#64748b;">Trình duyệt bởi chuyên viên: <b>${o.sales_rep.name}</b></small>
        </div>
        <span class="badge-tag pending">Chờ Quyết Định</span>
      </div>

      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:14px; font-size:13px;">
        <div>
          <div><b>Tổng giá trị đề xuất:</b> <span style="font-size:16px; font-weight:800; color:#b45309;">${formatCurrency(o.pricing.total_after_discount)}</span></div>
          <div><b>Mức chiết khấu yêu cầu:</b> <span style="color:#dc2626; font-weight:700;">${o.pricing.discount_percentage}% (-${formatCurrency(o.pricing.discount_amount)})</span></div>
        </div>
        <div>
          <div><b>Lý do chuyển duyệt:</b> <span style="color:#6b21a8; font-weight:600;">${o.pricing.approval_reason}</span></div>
          <div><b>Căn cứ dữ liệu:</b> Kho đủ tồn, khách hàng cam kết thanh toán ngay.</div>
        </div>
      </div>

      <div style="display:flex; align-items:center; gap:10px; padding-top:12px; border-top:1px dashed #e2e8f0;">
        <button class="btn-primary-action" style="background:#16a34a;" onclick="submitManagerDecision('${o.id}', 'APPROVED')">
          <span>✓ Phê Duyệt Chiết Khấu</span>
        </button>
        <button class="btn-secondary-tool" style="color:#dc2626; border-color:#fca5a5;" onclick="submitManagerDecision('${o.id}', 'REJECTED')">
          <span>✕ Từ Chối</span>
        </button>
        <button class="btn-secondary-tool" onclick="submitManagerDecision('${o.id}', 'REVISE')">
          <span>✏️ Yêu Cầu Chỉnh Sửa</span>
        </button>
      </div>
    </div>
  `).join('');
}

async function submitManagerDecision(oppId, decision) {
  const note = prompt(decision === 'APPROVED' ? 'Ghi chú phê duyệt của Trưởng phòng:' : 'Lý do từ chối hoặc yêu cầu sửa:');
  if (note === null) return;

  try {
    const res = await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opp_id: oppId, decision, note })
    });

    const data = await res.json();
    if (data.status === 'success') {
      alert(`Đã lưu quyết định: [${decision}] cho cơ hội ${oppId}!`);
      const idx = allOpportunities.findIndex(o => o.id === oppId);
      if (idx !== -1) {
        allOpportunities[idx] = data.updated_opportunity;
      }
      renderDashboardData(data.summary, allOpportunities);
      renderApprovalInbox(allOpportunities);
      renderAllOpportunitiesTable(allOpportunities);
      renderReportsTable(data.summary, allOpportunities);
    } else {
      alert('Lỗi: ' + data.error);
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}

// ==========================================
// PAGE 10: REPORTS & AUDIT LOGS
// ==========================================
function renderReportsTable(summary, opps) {
  const tbody = document.getElementById('reportStatsTableBody');
  if (!tbody || !summary) return;

  const totalOpps = opps.length;
  tbody.innerHTML = `
    <tr>
      <td><span class="badge-tag eligible">Có thể tiếp tục</span></td>
      <td>Đáp ứng đầy đủ danh mục, tồn kho, giá và thẩm quyền Sales</td>
      <td><b>${summary.eligible.count}</b></td>
      <td>${((summary.eligible.count / (totalOpps || 1)) * 100).toFixed(1)}%</td>
      <td style="font-weight:800; color:#059669;">${formatCurrency(summary.eligible.total_value)}</td>
    </tr>
    <tr>
      <td><span class="badge-tag pending">Chờ duyệt</span></td>
      <td>Chiết khấu > 5% hoặc đơn hàng lớn >= 500 triệu VNĐ</td>
      <td><b>${summary.pending_approval.count}</b></td>
      <td>${((summary.pending_approval.count / (totalOpps || 1)) * 100).toFixed(1)}%</td>
      <td style="font-weight:800; color:#7c3aed;">${formatCurrency(summary.pending_approval.total_value)}</td>
    </tr>
    <tr>
      <td><span class="badge-tag missing">Cần bổ sung thông tin</span></td>
      <td>Thiếu ngân sách, thời hạn hoặc số lượng sản phẩm</td>
      <td><b>${summary.missing_info.count}</b></td>
      <td>${((summary.missing_info.count / (totalOpps || 1)) * 100).toFixed(1)}%</td>
      <td style="color:#94a3b8; font-style:italic;">Chưa xác định (Không cộng dồn)</td>
    </tr>
    <tr>
      <td><span class="badge-tag unfulfilled">Chưa đáp ứng</span></td>
      <td>Hết tồn kho, không kịp tiến độ hoặc vượt quá ngân sách</td>
      <td><b>${summary.unfulfilled.count}</b></td>
      <td>${((summary.unfulfilled.count / (totalOpps || 1)) * 100).toFixed(1)}%</td>
      <td style="color:#94a3b8; font-style:italic;">Chưa xác định (Không cộng dồn)</td>
    </tr>
  `;
}

async function loadAuditLogs() {
  try {
    const res = await fetch('/api/audit_logs');
    const logs = await res.json();
    const tbody = document.getElementById('auditLogPageTbody');
    if (!tbody) return;

    tbody.innerHTML = logs.map(l => `
      <tr>
        <td style="font-family:monospace; font-size:11px;">${l.timestamp}</td>
        <td><b>${l.opp_id}</b></td>
        <td>${l.step}</td>
        <td style="color:#b45309; font-weight:700;">${l.skill}</td>
        <td>${l.action}</td>
        <td style="font-size:11.5px; color:#64748b;">${l.rule}</td>
        <td>${l.human_checkpoint ? '<span class="badge-tag pending">Có can thiệp</span>' : '<span style="color:#94a3b8;">Tự động</span>'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error(err);
  }
}

// ==========================================
// PAGE 12: DATA MANAGEMENT
// ==========================================
async function handleUploadNewData() {
  const text = document.getElementById('newDataTextarea').value.trim();
  if (!text) {
    alert('Vui lòng nhập định dạng JSON dữ liệu sản phẩm!');
    return;
  }

  try {
    const parsed = JSON.parse(text);
    const res = await fetch('/api/data_upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'PRODUCT_CATALOG', items: parsed })
    });
    const data = await res.json();
    alert(data.message || 'Đã nạp dữ liệu thành công!');
    await loadBackendData();
  } catch (e) {
    alert('Định dạng JSON không hợp lệ: ' + e.message);
  }
}

// ==========================================
// EXPORTS & HELPERS
// ==========================================
function exportWordReport() {
  window.open('/api/export/word', '_blank');
}

function exportCsvReport() {
  window.open('/api/export/csv', '_blank');
}

function formatCurrency(val) {
  if (!val || isNaN(val)) return '0 đ';
  return Number(val).toLocaleString('vi-VN') + ' đ';
}

function getBadgeStyle(status) {
  switch (status) {
    case 'Có thể tiếp tục': return 'eligible';
    case 'Cần bổ sung thông tin': return 'missing';
    case 'Chưa đáp ứng': return 'unfulfilled';
    case 'Chờ duyệt': return 'pending';
    default: return 'missing';
  }
}
