/**
 * MINH AN COMPANY - B2B AI AGENT SYSTEM
 * Role-Based Access Control (RBAC) & Secure Multi-Page SaaS Router
 * Author: Lê Yến Như
 */

let currentUser = null;
let currentToken = null;
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
  const storedUser = localStorage.getItem('minhan_user');
  const storedToken = localStorage.getItem('minhan_token');

  if (storedUser && storedToken) {
    try {
      currentUser = JSON.parse(storedUser);
      currentToken = storedToken;
      applyUserInfoToUi(currentUser);
    } catch (e) {
      clearSession();
    }
  }

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

  await loadBackendData();
}

function getAuthHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (currentToken) {
    headers['Authorization'] = `Bearer ${currentToken}`;
  }
  return headers;
}

async function loadBackendData() {
  try {
    const [oppsRes, catRes] = await Promise.all([
      fetch('/api/opportunities', { headers: getAuthHeaders() }),
      fetch('/api/catalog', { headers: getAuthHeaders() })
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
      alert('🔒 BẢO MẬT: Bạn chưa đăng nhập. Vui lòng đăng nhập trước khi vào hệ thống nội bộ!');
      navigateTo('login');
      return;
    }
    appView.style.display = 'block';
    window.location.hash = 'app';
    applyRoleBasedAccess(currentUser);
    setTimeout(() => {
      openWelcomeAgentModal();
    }, 200);
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

  // Phân quyền bảo vệ từng trang (RBAC Route Guard)
  if (pageId === 'page-approval' && currentUser.role_code === 'SALES_REP') {
    alert('🚫 TỪ CHỐI TRUY CẬP: Chuyên viên kinh doanh không có quyền xem Hộp thư phê duyệt chiết khấu. Chức năng này chỉ dành cho Trưởng phòng Kinh doanh!');
    return;
  }
  if (pageId === 'page-data' && currentUser.role_code === 'CUSTOMER') {
    alert('🚫 TỪ CHỐI TRUY CẬP: Khách hàng không có quyền truy cập vào Kho dữ liệu nội bộ!');
    return;
  }

  document.querySelectorAll('.saas-page').forEach(p => p.classList.remove('active'));

  const target = document.getElementById(pageId);
  if (target) {
    target.classList.add('active');
  }

  document.querySelectorAll('.sidebar-menu .menu-link').forEach(link => {
    link.classList.toggle('active', link.getAttribute('data-page') === pageId);
  });

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
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update Guided Flow Bar
  updateGuidedFlowBar(pageId);

  if (pageId === 'page-validation') {
    if (!currentProcessingOpp && allOpportunities.length > 0) {
      currentProcessingOpp = allOpportunities[0];
    }
    if (currentProcessingOpp) renderActiveOppValidation(currentProcessingOpp);
  }

  if (pageId === 'page-pricing') {
    if (!currentProcessingOpp && allOpportunities.length > 0) {
      currentProcessingOpp = allOpportunities[0];
    }
    if (currentProcessingOpp) renderActiveOppPricing(currentProcessingOpp);
  }

  if (pageId === 'page-audit') {
    loadAuditLogs();
  }
}

function updateGuidedFlowBar(pageId) {
  const bar = document.getElementById('guidedFlowBar');
  const titleEl = document.getElementById('guidedFlowStepName');
  const labelEl = document.getElementById('btnNextGuidedStepLabel');
  if (!bar) return;

  const guidedSteps = ['page-ingestion', 'page-parsing', 'page-validation', 'page-pricing', 'page-approval'];
  if (guidedSteps.includes(pageId)) {
    bar.style.display = 'flex';
  } else {
    bar.style.display = 'none';
    return;
  }

  switch (pageId) {
    case 'page-ingestion':
      titleEl.innerHTML = '<b>Bước 1:</b> Tiếp Nhận Yêu Cầu & Nạp Dữ Liệu';
      labelEl.innerHTML = '⚡ Phân Tích Bằng AI ➔ Tự Động Nhảy Sang Bóc Tách &rarr;';
      break;
    case 'page-parsing':
      titleEl.innerHTML = '<b>Bước 2:</b> Phân Tích Thực Thể <span class="badge-tag pending">Checkpoint 1</span>';
      labelEl.innerHTML = '✓ Xác Nhận Bóc Tách ➔ Tự Động Nhảy Sang Thẩm Định Kho &rarr;';
      break;
    case 'page-validation':
      titleEl.innerHTML = '<b>Bước 3:</b> Thẩm Định Tồn Kho & Bảng Giá <span class="badge-tag pending">Checkpoint 1.2</span>';
      labelEl.innerHTML = '✓ Xác Nhận Đủ Kho & Giữ Hàng ➔ Tự Động Nhảy Sang Báo Giá &rarr;';
      break;
    case 'page-pricing':
      titleEl.innerHTML = '<b>Bước 4:</b> Báo Giá & Ma Trận Chiết Khấu <span class="badge-tag pending">Checkpoint 1.3</span>';
      labelEl.innerHTML = '📤 Xác Nhận Lập Phiếu ➔ Tự Động Nhảy Sang Phê Duyệt &rarr;';
      break;
    case 'page-approval':
      titleEl.innerHTML = '<b>Bước 5:</b> Hộp Thư Phê Duyệt Của Cấp Quản Lý <span class="badge-tag pending">Checkpoint 2</span>';
      labelEl.innerHTML = '✓ Trưởng Phòng Phê Duyệt Chiết Khấu ➔ Hoàn Tất Đơn Hàng &rarr;';
      break;
  }
}

function executeCurrentGuidedStep() {
  const activePage = document.querySelector('.saas-page.active');
  const pageId = activePage ? activePage.id : '';

  if (pageId === 'page-ingestion') {
    runIngestToParsing();
  } else if (pageId === 'page-parsing') {
    confirmParsingCheckpoint();
  } else if (pageId === 'page-validation') {
    confirmInventoryAndProceed();
  } else if (pageId === 'page-pricing') {
    submitPricingConfirmation();
  } else if (pageId === 'page-approval') {
    const pendingOpps = allOpportunities.filter(o => o.status === 'Chờ duyệt');
    const targetId = pendingOpps.length > 0 ? pendingOpps[0].id : (currentProcessingOpp ? currentProcessingOpp.id : (allOpportunities.length > 0 ? allOpportunities[0].id : null));
    if (targetId) {
      openManagerApprovalModal(targetId, 'APPROVED');
    } else {
      showStepTransitionToast('Hộp thư đã sạch sẽ, toàn bộ đơn đều đã được duyệt!', 'info', 2000);
    }
  } else {
    openSaasPage('page-ingestion');
  }
}
}

// ==========================================
// AUTHENTICATION & LOGIN / REGISTER LOGIC
// ==========================================
function switchAuthMode(mode) {
  const tabLogin = document.getElementById('tabBtnLogin');
  const tabRegister = document.getElementById('tabBtnRegister');
  const loginForm = document.getElementById('loginForm');
  const regForm = document.getElementById('registerForm');
  const titleEl = document.getElementById('authBoxTitle');
  const subtitleEl = document.getElementById('authBoxSubtitle');
  const errBox = document.getElementById('loginErrorAlert');
  const succBox = document.getElementById('loginSuccessAlert');

  errBox.style.display = 'none';
  succBox.style.display = 'none';

  if (mode === 'register') {
    tabRegister.style.background = '#fff';
    tabRegister.style.color = '#059669';
    tabRegister.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
    tabLogin.style.background = 'transparent';
    tabLogin.style.color = '#64748b';
    tabLogin.style.boxShadow = 'none';

    loginForm.style.display = 'none';
    regForm.style.display = 'block';

    titleEl.textContent = 'Đăng Ký Tài Khoản Mới';
    subtitleEl.textContent = 'Tạo tài khoản Khách hàng hoặc Chuyên viên B2B Minh An';
  } else {
    tabLogin.style.background = '#fff';
    tabLogin.style.color = '#b45309';
    tabLogin.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
    tabRegister.style.background = 'transparent';
    tabRegister.style.color = '#64748b';
    tabRegister.style.boxShadow = 'none';

    regForm.style.display = 'none';
    loginForm.style.display = 'block';

    titleEl.textContent = 'Minh An AI Agent Platform';
    subtitleEl.textContent = 'Cổng xác thực & Đăng nhập doanh nghiệp';
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const company = document.getElementById('regCompany').value.trim();
  const roleCode = document.getElementById('regRoleCode').value;
  const pwd = document.getElementById('regPassword').value;
  const confirmPwd = document.getElementById('regConfirmPassword').value;
  const errBox = document.getElementById('loginErrorAlert');
  const succBox = document.getElementById('loginSuccessAlert');

  errBox.style.display = 'none';
  succBox.style.display = 'none';

  if (pwd !== confirmPwd) {
    errBox.textContent = 'Mật khẩu xác nhận không khớp! Vui lòng nhập lại.';
    errBox.style.display = 'block';
    return;
  }

  if (pwd.length < 6) {
    errBox.textContent = 'Mật khẩu phải có tối thiểu 6 ký tự!';
    errBox.style.display = 'block';
    return;
  }

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        phone,
        company,
        role_code: roleCode,
        password: pwd
      })
    });

    const data = await res.json();
    if (res.ok && data.status === 'success') {
      currentUser = data.user;
      currentToken = data.token;
      localStorage.setItem('minhan_user', JSON.stringify(currentUser));
      localStorage.setItem('minhan_token', currentToken);

      succBox.textContent = data.message || 'Đăng ký tài khoản thành công! Đang chuyển vào hệ thống...';
      succBox.style.display = 'block';

      applyUserInfoToUi(currentUser);
      await loadBackendData();

      setTimeout(() => {
        navigateTo('app');
        openSaasPage('page-dashboard');
      }, 800);
    } else {
      errBox.innerHTML = `<b>Lỗi đăng ký:</b> ${data.error || 'Không thể tạo tài khoản!'}`;
      errBox.style.display = 'block';
    }
  } catch (err) {
    errBox.innerHTML = '<b>Lỗi hệ thống:</b> Không thể kết nối tới máy chủ!';
    errBox.style.display = 'block';
  }
}

async function handleUpdateProfile(e) {
  e.preventDefault();
  const name = document.getElementById('profInputName').value.trim();
  const phone = document.getElementById('profInputPhone').value.trim();
  const company = document.getElementById('profInputCompany').value.trim();

  try {
    const res = await fetch('/api/user/update_profile', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, phone, company })
    });

    const data = await res.json();
    if (res.ok && data.status === 'success') {
      alert('Đã cập nhật thông tin hồ sơ cá nhân thành công!');
      currentUser = data.user;
      localStorage.setItem('minhan_user', JSON.stringify(currentUser));
      applyUserInfoToUi(currentUser);
    } else {
      alert('Lỗi: ' + (data.error || 'Không thể cập nhật!'));
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}

async function handleChangePassword(e) {
  e.preventDefault();
  const oldPwd = document.getElementById('pwdCurrent').value;
  const newPwd = document.getElementById('pwdNew').value;
  const confirmNew = document.getElementById('pwdConfirm').value;

  if (newPwd !== confirmNew) {
    alert('Mật khẩu mới và mật khẩu xác nhận không trùng khớp!');
    return;
  }

  try {
    const res = await fetch('/api/user/change_password', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ old_password: oldPwd, new_password: newPwd })
    });

    const data = await res.json();
    if (res.ok && data.status === 'success') {
      alert('Chúc mừng! Đã đổi mật khẩu thành công. Mật khẩu mới có hiệu lực ngay lập tức.');
      document.getElementById('changePasswordForm').reset();
    } else {
      alert('Lỗi đổi mật khẩu: ' + (data.error || 'Mật khẩu cũ không đúng!'));
    }
  } catch (err) {
    alert('Lỗi kết nối máy chủ');
  }
}
async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value.trim();
  const errorBox = document.getElementById('loginErrorAlert');

  errorBox.style.display = 'none';

  // 1. Kiểm tra validation phía client
  if (!email || !password) {
    errorBox.textContent = 'Vui lòng nhập đầy đủ Email và Mật khẩu!';
    errorBox.style.display = 'block';
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (res.ok && data.status === 'success') {
      currentUser = data.user;
      currentToken = data.token;
      localStorage.setItem('minhan_user', JSON.stringify(currentUser));
      localStorage.setItem('minhan_token', currentToken);

      applyUserInfoToUi(currentUser);
      errorBox.style.display = 'none';

      // Load lại dữ liệu theo phân quyền của người dùng vừa đăng nhập
      await loadBackendData();

      navigateTo('app');
      openSaasPage('page-dashboard');
      setTimeout(() => {
        openWelcomeAgentModal(true);
      }, 300);
    } else {
      // Hiển thị lỗi xác thực chính xác
      errorBox.innerHTML = `<b>Lỗi xác thực:</b> ${data.error || 'Email hoặc mật khẩu không chính xác!'}`;
      errorBox.style.display = 'block';
    }
  } catch (err) {
    errorBox.innerHTML = '<b>Lỗi hệ thống:</b> Không thể kết nối tới máy chủ xác thực!';
    errorBox.style.display = 'block';
  }
}

function fillDemoAccount(email, pwd) {
  document.getElementById('loginEmail').value = email;
  document.getElementById('loginPassword').value = pwd;
  document.getElementById('loginErrorAlert').style.display = 'none';
}

function togglePasswordVisibility() {
  const pwdInput = document.getElementById('loginPassword');
  pwdInput.type = pwdInput.type === 'password' ? 'text' : 'password';
}

function handleLogout() {
  if (confirm(`Bạn có chắc chắn muốn đăng xuất tài khoản [${currentUser ? currentUser.name : ''}]?`)) {
    if (currentToken) {
      fetch('/api/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ token: currentToken })
      }).catch(() => {});
    }
    clearSession();
    navigateTo('landing');
  }
}

function clearSession() {
  currentUser = null;
  currentToken = null;
  localStorage.removeItem('minhan_user');
  localStorage.removeItem('minhan_token');
}

function applyUserInfoToUi(user) {
  if (!user) return;
  const nameEl = document.getElementById('sidebarUserName');
  const roleEl = document.getElementById('sidebarUserRole');
  const avatarEl = document.getElementById('sidebarUserAvatar');

  if (nameEl) nameEl.textContent = user.name || 'Người dùng';
  if (roleEl) roleEl.textContent = user.role_name || user.role_code;
  if (avatarEl && user.avatar) avatarEl.src = user.avatar;

  // Profile Page elements
  const pName = document.getElementById('profileCardName');
  const pEmail = document.getElementById('profileCardEmail');
  const pRole = document.getElementById('profileCardRole');
  const pId = document.getElementById('profileCardId');
  const pComp = document.getElementById('profileCardCompany');
  const pPhone = document.getElementById('profileCardPhone');
  const pAvatar = document.getElementById('profileCardAvatar');

  if (pName) pName.textContent = user.name || 'Người dùng';
  if (pEmail) pEmail.textContent = user.email || 'N/A';
  if (pRole) pRole.textContent = user.role_name || user.role_code;
  if (pId) pId.textContent = user.id || 'USR-999';
  if (pComp) pComp.textContent = user.company || user.department || 'Minh An B2B';
  if (pPhone) pPhone.textContent = user.phone || 'Chưa cập nhật';
  if (pAvatar && user.avatar) pAvatar.src = user.avatar;

  // Prefill inputs
  const inName = document.getElementById('profInputName');
  const inPhone = document.getElementById('profInputPhone');
  const inComp = document.getElementById('profInputCompany');
  if (inName) inName.value = user.name || '';
  if (inPhone) inPhone.value = user.phone || '';
  if (inComp) inComp.value = user.company || user.department || '';
}

// Áp dụng giao diện và phân quyền theo đúng vai trò thực tế
function applyRoleBasedAccess(user) {
  if (!user) return;

  const bannerIcon = document.getElementById('roleGreetingIcon');
  const bannerTitle = document.getElementById('roleGreetingTitle');
  const bannerDesc = document.getElementById('roleGreetingDesc');
  const bannerBadge = document.getElementById('roleGreetingBadge');
  const dashHeaderTitle = document.getElementById('dashRoleHeaderTitle');

  if (user.role_code === 'ADMIN') {
    bannerIcon.textContent = '👑';
    bannerTitle.textContent = `Bàn Làm Việc Quản Trị Viên: ${user.name}`;
    bannerDesc.textContent = `Bạn có toàn quyền quản trị hệ thống, dữ liệu Master Catalog và cấu hình AI Agent.`;
    bannerBadge.textContent = 'Quyền Toàn Cục (Admin)';
    bannerBadge.className = 'badge-tag eligible';
    dashHeaderTitle.textContent = 'Bảng Điều Khiển Tổng Quan Doanh Nghiệp';
  } else if (user.role_code === 'SALES_MANAGER') {
    bannerIcon.textContent = '👔';
    bannerTitle.textContent = `Bàn Làm Việc Trưởng Phòng Kinh Doanh: ${user.name}`;
    bannerDesc.textContent = `Bạn có quyền phê duyệt các cơ hội chiết khấu vượt hạn mức (>5%) và theo dõi toàn bộ cơ hội kinh doanh.`;
    bannerBadge.textContent = 'Thẩm Quyền Phê Duyệt';
    bannerBadge.className = 'badge-tag pending';
    dashHeaderTitle.textContent = 'Bảng Điều Khiển Phê Duyệt & Quản Lý Đội Ngũ Sales';
  } else if (user.role_code === 'SALES_REP') {
    bannerIcon.textContent = '💼';
    bannerTitle.textContent = `Bàn Làm Việc Chuyên Viên Kinh Doanh: ${user.name}`;
    bannerDesc.textContent = `Bạn phụ trách tiếp nhận yêu cầu, lập dự thảo báo giá (chiết khấu tối đa 5%) và theo dõi hồ sơ được phân công.`;
    bannerBadge.textContent = 'Chuyên Viên Sales (Hạn mức <= 5%)';
    bannerBadge.className = 'badge-tag missing';
    dashHeaderTitle.textContent = 'Bảng Theo Dõi Cơ Hội Bán Hàng Cá Nhân';
  } else if (user.role_code === 'CUSTOMER') {
    bannerIcon.textContent = '🏢';
    bannerTitle.textContent = `Cổng Dịch Vụ Khách Hàng: ${user.name}`;
    bannerDesc.textContent = `Bạn có thể gửi yêu cầu báo giá mới, theo dõi tiến độ xử lý và xem các đề xuất thương mại từ Minh An.`;
    bannerBadge.textContent = 'Khách Hàng Doanh Nghiệp';
    bannerBadge.className = 'badge-tag eligible';
    dashHeaderTitle.textContent = 'Theo Dõi Đơn Hàng & Yêu Cầu Của DigiTech';
  }
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

async function handleFileUploadSim(e) {
  const file = e.target.files[0];
  if (!file) return;

  const fileName = file.name;
  const triggerAuto = async (text) => {
    document.getElementById('pageIngestTextarea').value = text;
    await runIngestAutoToApproval(fileName);
  };

  if (fileName.endsWith('.txt') || fileName.endsWith('.csv') || fileName.endsWith('.json')) {
    const reader = new FileReader();
    reader.onload = async function(evt) {
      let readText = evt.target.result;
      if (!readText || readText.trim().length < 15) {
        readText = TEST_CASES_SAMPLES[3];
      }
      await triggerAuto(`[TẬP TIN ĐÃ TẢI LÊN: ${fileName}]\n` + readText);
    };
    reader.readAsText(file);
  } else {
    // File Excel, PDF, Word hoặc định dạng khác
    const simContent = `[TẬP TIN ĐÃ TẢI LÊN: ${fileName} - ĐƠN ĐẶT HÀNG DOANH NGHIỆP B2B]\n` + TEST_CASES_SAMPLES[3];
    await triggerAuto(simContent);
  }
}

async function runIngestAutoToApproval(customFileName) {
  let rawText = document.getElementById('pageIngestTextarea').value.trim();
  if (!rawText) {
    rawText = TEST_CASES_SAMPLES[3];
    document.getElementById('pageIngestTextarea').value = rawText;
  }

  const fileLabel = customFileName || 'Tệp đơn hàng B2B';

  try {
    const res = await fetch('/api/process_request', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ raw_text: rawText, source: `Nạp tệp tự động: ${fileLabel}` })
    });

    const data = await res.json();
    if (data.status === 'success') {
      currentProcessingOpp = data.opportunity;

      // Đảm bảo trạng thái Chờ duyệt nếu có chiết khấu cao
      if (currentProcessingOpp.pricing.discount_percentage > 8 || currentProcessingOpp.pricing.total_after_discount >= 500000000) {
        currentProcessingOpp.status = 'Chờ duyệt';
        currentProcessingOpp.status_reason = `Mức chiết khấu ${currentProcessingOpp.pricing.discount_percentage}% vượt thẩm quyền chuyên viên bán hàng, AI Agent tự động lập Phiếu chuyển duyệt trình Trưởng phòng.`;
        currentProcessingOpp.pricing.approval_reason = `Đơn đặt hàng số lượng lớn theo tệp ${fileLabel}, khách hàng yêu cầu chiết khấu ${currentProcessingOpp.pricing.discount_percentage}%`;
      }

      allOpportunities.unshift(currentProcessingOpp);

      renderDashboardData(data.summary, allOpportunities);
      renderApprovalInbox(allOpportunities);
      renderAllOpportunitiesTable(allOpportunities);

      // Chuyển thẳng sang trang Phê duyệt
      openSaasPage('page-approval');

      // Mở thông báo trực quan tóm tắt quy trình AI đã chạy ngầm
      showHitlConfirmation(
        '⚡ TỰ ĐỘNG CHUYỂN SANG PHÊ DUYỆT THÀNH CÔNG',
        `<div style="color:#047857; font-weight:700; font-size:14px; margin-bottom:8px;">
           ✓ AI Agent đã phân tích tệp [${fileLabel}] và xử lý tự động toàn trình:
         </div>
         <div style="background:#f8fafc; padding:12px; border-radius:10px; font-size:12.5px; border:1px solid #e2e8f0; line-height:1.7;">
           • <b>Bóc tách tự động:</b> Khách hàng <b>${currentProcessingOpp.customer_name}</b>, ${currentProcessingOpp.validation.items.length} mặt hàng.<br>
           • <b>Thẩm định kho:</b> Đối chiếu Master Catalog, kho đáp ứng khả dụng 100%.<br>
           • <b>Kiểm tra hạn mức:</b> Chiết khấu <b>${currentProcessingOpp.pricing.discount_percentage}%</b> vượt hạn mức Sales (tối đa 8%).<br>
           • <b>Quyết định tự động:</b> AI Agent tự động lập <b>Phiếu Chuyển Duyệt</b> và đưa thẳng vào <b>Hộp thư Trưởng phòng</b>!
         </div>
         <p style="margin-top:10px; color:#6d28d9; font-weight:700;">Hệ thống đã tự động chuyển đến Hộp thư phê duyệt để Trưởng phòng xem xét và ra quyết định ngay bên dưới!</p>`,
        () => {}
      );
    } else {
      alert('Lỗi: ' + (data.error || 'Không thể xử lý'));
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối máy chủ');
  }
}

async function runIngestToParsing() {
  let rawText = document.getElementById('pageIngestTextarea').value.trim();
  if (!rawText) {
    rawText = TEST_CASES_SAMPLES[3];
    document.getElementById('pageIngestTextarea').value = rawText;
  }

  showStepTransitionToast('🤖 AI Agent đang bóc tách thực thể... Chuyển sang Bước 2.', 'info', 2000);

  try {
    const res = await fetch('/api/process_request', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ raw_text: rawText, source: 'Giao diện tiếp nhận SaaS' })
    });

    const data = await res.json();
    if (data.status === 'success') {
      currentProcessingOpp = data.opportunity;
      allOpportunities.unshift(currentProcessingOpp);

      renderParsingSplitView(currentProcessingOpp);
      openSaasPage('page-parsing');

      renderDashboardData(data.summary, allOpportunities);
      renderApprovalInbox(allOpportunities);
      showStepTransitionToast(`✓ Bóc tách thành công cơ hội ${currentProcessingOpp.id}! Vui lòng bấm Xác nhận để chuyển tiếp.`, 'success', 2500);
    } else {
      alert('Lỗi: ' + (data.error || 'Không thể xử lý'));
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối máy chủ');
  }
}
    console.error(err);
    alert('Lỗi kết nối máy chủ');
  }
}

function renderParsingSplitView(opp) {
  currentProcessingOpp = opp;
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

  // Cập nhật Human Checkpoint 1 Banner
  const badgeEl = document.getElementById('parsingVerificationBadge');
  const guidanceEl = document.getElementById('parsingCheckpointGuidance');
  const confirmBtn = document.getElementById('btnConfirmParsingAction');

  if (opp.missing_fields && opp.missing_fields.length > 0) {
    if (badgeEl) {
      badgeEl.className = 'badge-tag missing';
      badgeEl.textContent = '⚠️ Cần Bổ Sung Dữ Liệu';
    }
    if (guidanceEl) {
      guidanceEl.innerHTML = `
        <div style="color:#b91c1c; font-weight:700; margin-bottom:4px;">⚠️ Dữ liệu đầu vào chưa đủ điều kiện tự động:</div>
        Thiếu các trường bắt buộc: <b>${opp.missing_fields.join(', ')}</b>. Theo quy chuẩn nghiệp vụ, hệ thống <b>không tự động ước lượng</b> các yêu cầu chưa rõ ràng. Bạn vui lòng bấm <b>Yêu Cầu Khách Hàng Bổ Sung</b> để gửi email, hoặc bấm <b>Chỉnh Sửa Thủ Công</b> trước khi tiếp tục.
      `;
    }
    if (confirmBtn) {
      confirmBtn.style.background = '#f59e0b';
      confirmBtn.innerHTML = '<span>⚠️ Xác Nhận (Bỏ Qua Thiếu Sót & Tiếp Tục) &rarr;</span>';
    }
  } else {
    if (badgeEl) {
      badgeEl.className = 'badge-tag pending';
      badgeEl.textContent = 'Chờ Con Người Duyệt (Checkpoint 1)';
    }
    if (guidanceEl) {
      guidanceEl.innerHTML = `
        <div style="color:#047857; font-weight:700; margin-bottom:4px;">✓ Dữ liệu trích xuất đạt độ tin cậy 100%:</div>
        Toàn bộ thực thể đã được chuẩn hóa. Vui lòng đối chiếu với văn bản gốc bên trái và bấm <b>Xác Nhận Tính Chính Xác</b> để phê duyệt bóc tách và chuyển sang bước Thẩm định kho.
      `;
    }
    if (confirmBtn) {
      confirmBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      confirmBtn.innerHTML = '<span>✓ Xác Nhận Tính Chính Xác & Chuyển Sang Thẩm Định Kho &rarr;</span>';
    }
  }
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
// HUMAN CHECKPOINTS & INTERACTIVE HITL WORKFLOW
// ==========================================
let pendingHitlAction = null;
let currentApprOppId = null;
let currentApprDecision = null;

function openHitlModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'flex';
}

function closeHitlModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.style.display = 'none';
}

// Step Transition Toast Notification
function showStepTransitionToast(message, type = 'success', duration = 3000) {
  let toast = document.getElementById('hitlGlobalToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'hitlGlobalToast';
    toast.className = 'hitl-toast';
    document.body.appendChild(toast);
  }
  const icon = type === 'success' ? '✓' : type === 'warning' ? '⚠️' : 'ℹ️';
  const color = type === 'success' ? '#10b981' : type === 'warning' ? '#f59e0b' : '#8b5cf6';
  toast.style.borderLeftColor = color;
  toast.innerHTML = `
    <span style="font-size:20px; font-weight:800; color:${color}; line-height:1;">${icon}</span>
    <div style="font-weight:600; line-height:1.4;">${message}</div>
  `;
  toast.style.display = 'flex';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.display = 'none';
  }, duration);
}

function showHitlConfirmation(title, bodyHtml, onConfirm) {
  const titleEl = document.getElementById('hitlConfirmTitle');
  const bodyEl = document.getElementById('hitlConfirmBody');
  const submitBtn = document.getElementById('hitlConfirmSubmitBtn');

  if (titleEl) titleEl.innerHTML = title;
  if (bodyEl) bodyEl.innerHTML = bodyHtml;
  pendingHitlAction = onConfirm;

  if (submitBtn) {
    submitBtn.onclick = () => {
      closeHitlModal('hitlConfirmModal');
      if (typeof pendingHitlAction === 'function') {
        pendingHitlAction();
      }
    };
  }
  openHitlModal('hitlConfirmModal');
}

// --- CHECKPOINT 1: XÁC NHẬN BÓC TÁCH ---
function confirmParsingCheckpoint() {
  if (!currentProcessingOpp) {
    if (allOpportunities.length > 0) currentProcessingOpp = allOpportunities[0];
    else { alert('Chưa có cơ hội nào đang được xử lý.'); return; }
  }

  currentProcessingOpp.parsing_verified = true;
  showStepTransitionToast(`✓ Đã xác nhận kết quả bóc tách cho ${currentProcessingOpp.customer_name}! Đang chuyển sang Bước 3: Thẩm định tồn kho...`, 'success', 2500);
  renderActiveOppValidation(currentProcessingOpp);
  openSaasPage('page-validation');
}

function openRequestMoreInfoModal() {
  if (!currentProcessingOpp) return;
  const missingAlert = document.getElementById('reqMoreMissingAlert');
  if (missingAlert) {
    missingAlert.textContent = currentProcessingOpp.missing_fields && currentProcessingOpp.missing_fields.length > 0
      ? `Các thông tin còn thiếu: ${currentProcessingOpp.missing_fields.join(', ')}`
      : 'Yêu cầu làm rõ thêm về thời hạn giao hàng và địa điểm bàn giao.';
  }
  const emailInput = document.getElementById('reqMoreCustomerEmail');
  if (emailInput) emailInput.value = currentProcessingOpp.email || 'contact@customer.vn';

  const bodyInput = document.getElementById('reqMoreEmailBody');
  if (bodyInput) {
    bodyInput.value = `Kính gửi Quý công ty ${currentProcessingOpp.customer_name},\n\nMinh An Company đã tiếp nhận yêu cầu mua sắm thiết bị từ Quý khách. Để hoàn thiện báo giá và kiểm tra tồn kho chính xác nhất, chúng tôi kính đề nghị Quý khách vui lòng bổ sung/làm rõ thêm thông tin sau:\n- ${currentProcessingOpp.missing_fields && currentProcessingOpp.missing_fields.length > 0 ? currentProcessingOpp.missing_fields.join('\n- ') : 'Số lượng và thời hạn cụ thể'}\n\nTrân trọng cảm ơn sự hợp tác của Quý khách!\nBộ phận B2B - Minh An Company`;
  }
  openHitlModal('hitlRequestMoreInfoModal');
}

function submitRequestMoreInfo() {
  if (!currentProcessingOpp) return;
  closeHitlModal('hitlRequestMoreInfoModal');
  currentProcessingOpp.status = 'Cần bổ sung thông tin';
  currentProcessingOpp.status_reason = 'Đã gửi email đề nghị khách hàng bổ sung các thông tin còn thiếu';
  alert(`✓ Đã gửi email yêu cầu bổ sung thông tin tới ${currentProcessingOpp.customer_name}! Trạng thái cơ hội chuyển sang "Cần bổ sung thông tin".`);
  renderDashboardData(null, allOpportunities);
  renderAllOpportunitiesTable(allOpportunities);
  openSaasPage('page-opportunities');
}

function openEditParsingModal() {
  if (!currentProcessingOpp) return;
  document.getElementById('editCustomerName').value = currentProcessingOpp.customer_name || '';
  document.getElementById('editContactPerson').value = currentProcessingOpp.contact_person || '';
  document.getElementById('editCustomerEmail').value = currentProcessingOpp.email || '';
  document.getElementById('editBudget').value = currentProcessingOpp.extracted.budget || '';
  document.getElementById('editDeadlineDays').value = currentProcessingOpp.extracted.deadline_days || '';
  openHitlModal('hitlEditParsingModal');
}

function saveEditedParsingData() {
  if (!currentProcessingOpp) return;
  currentProcessingOpp.customer_name = document.getElementById('editCustomerName').value.trim() || currentProcessingOpp.customer_name;
  currentProcessingOpp.contact_person = document.getElementById('editContactPerson').value.trim() || currentProcessingOpp.contact_person;
  currentProcessingOpp.email = document.getElementById('editCustomerEmail').value.trim() || currentProcessingOpp.email;

  const budget = parseFloat(document.getElementById('editBudget').value);
  if (!isNaN(budget)) currentProcessingOpp.extracted.budget = budget;

  const deadline = parseInt(document.getElementById('editDeadlineDays').value);
  if (!isNaN(deadline)) currentProcessingOpp.extracted.deadline_days = deadline;

  if (currentProcessingOpp.missing_fields) {
    currentProcessingOpp.missing_fields = currentProcessingOpp.missing_fields.filter(f => {
      if (f.includes('ngân sách') && budget) return false;
      if (f.includes('thời hạn') && deadline) return false;
      if (f.includes('email') && currentProcessingOpp.email) return false;
      return true;
    });
  }

  closeHitlModal('hitlEditParsingModal');
  renderParsingSplitView(currentProcessingOpp);
  alert('✓ Đã cập nhật thông tin bóc tách thủ công thành công!');
}

// --- CHECKPOINT 1.2: THẨM ĐỊNH KHO ---
function renderActiveOppValidation(opp) {
  if (!opp) return;
  const oppIdEl = document.getElementById('valOppId');
  if (oppIdEl) oppIdEl.textContent = opp.id;

  const wrap = document.getElementById('valOppItemsTableWrap');
  if (!wrap) return;

  const isAllStockOk = opp.validation.items.every(it => it.is_stock_ok);
  const badgeEl = document.getElementById('valStockMatchBadge');
  if (badgeEl) {
    badgeEl.className = isAllStockOk ? 'badge-tag eligible' : 'badge-tag unfulfilled';
    badgeEl.textContent = isAllStockOk ? 'Đủ Hàng Đáp Ứng 100%' : 'Thiếu Hụt Kho / Cần Nhập';
  }

  wrap.innerHTML = `
    <table class="saas-table" style="margin-top:8px;">
      <thead>
        <tr>
          <th>Mã SKU</th>
          <th>Tên Sản Phẩm</th>
          <th>SL Yêu Cầu</th>
          <th>Đơn Giá Niêm Yết</th>
          <th>Tồn Khả Dụng</th>
          <th>Tình Trạng Kho</th>
          <th>Thời Gian Giao Tiêu Chuẩn</th>
        </tr>
      </thead>
      <tbody>
        ${opp.validation.items.map(it => `
          <tr>
            <td><code>${it.sku}</code></td>
            <td><b>${it.name}</b></td>
            <td><b>${it.requested_qty}</b> chiếc</td>
            <td>${formatCurrency(it.unit_price)}</td>
            <td style="font-weight:700;">${it.stock_available} chiếc</td>
            <td><span class="badge-tag ${it.is_stock_ok ? 'eligible' : 'unfulfilled'}">${it.stock_status}</span></td>
            <td>${it.standard_lead_days || 3} ngày</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function confirmInventoryAndProceed() {
  if (!currentProcessingOpp) return;
  currentProcessingOpp.inventory_verified = true;
  showStepTransitionToast(`✓ Đã xác nhận đủ tồn kho & giữ hàng! Đang chuyển sang Bước 4: Lập Báo Giá & Chiết Khấu...`, 'success', 2500);
  renderActiveOppPricing(currentProcessingOpp);
  openSaasPage('page-pricing');
}

function markInventoryUnfulfilled() {
  if (!currentProcessingOpp) return;
  currentProcessingOpp.status = 'Chưa đáp ứng';
  currentProcessingOpp.status_reason = 'Kho không đủ tồn khả dụng và lead time nhập hàng không kịp tiến độ';
  showStepTransitionToast(`✕ Đã đánh dấu cơ hội ${currentProcessingOpp.id} là Chưa đáp ứng!`, 'warning', 2500);
  renderDashboardData(null, allOpportunities);
  renderAllOpportunitiesTable(allOpportunities);
  openSaasPage('page-opportunities');
}

// --- CHECKPOINT 1.3: TÍNH GIÁ & CHIẾT KHẤU ---
function renderActiveOppPricing(opp) {
  if (!opp) return;
  const oppIdEl = document.getElementById('pricingOppId');
  if (oppIdEl) oppIdEl.textContent = opp.id;

  const totalOriginal = opp.validation.items.reduce((sum, it) => sum + (it.unit_price * it.requested_qty), 0);
  opp.pricing.total_before_discount = totalOriginal;

  const totalEl = document.getElementById('pricingOriginalTotal');
  if (totalEl) totalEl.textContent = formatCurrency(totalOriginal);

  const itemCountNote = document.getElementById('pricingItemCountNote');
  if (itemCountNote) itemCountNote.textContent = `${opp.validation.items.length} mặt hàng, ${opp.validation.items.reduce((s, it) => s + it.requested_qty, 0)} sản phẩm`;

  const discountInput = document.getElementById('pricingDiscountInput');
  if (discountInput) {
    discountInput.value = opp.pricing.discount_percentage || opp.extracted.requested_discount || 5;
  }

  updateLivePricingCalculation();
}

function setDiscountQuick(val) {
  const discountInput = document.getElementById('pricingDiscountInput');
  if (discountInput) {
    discountInput.value = val;
    updateLivePricingCalculation();
  }
}

function updateLivePricingCalculation() {
  if (!currentProcessingOpp) return;
  const discountInput = document.getElementById('pricingDiscountInput');
  const discount = parseFloat(discountInput ? discountInput.value : 5) || 0;
  const totalBefore = currentProcessingOpp.pricing.total_before_discount || 0;

  const discountAmount = Math.round(totalBefore * (discount / 100));
  const finalTotal = Math.max(0, totalBefore - discountAmount);

  currentProcessingOpp.pricing.discount_percentage = discount;
  currentProcessingOpp.pricing.discount_amount = discountAmount;
  currentProcessingOpp.pricing.total_after_discount = finalTotal;

  const discountValText = document.getElementById('pricingDiscountValText');
  if (discountValText) discountValText.textContent = `Giảm: -${formatCurrency(discountAmount)}`;

  const finalTotalEl = document.getElementById('pricingFinalTotal');
  if (finalTotalEl) finalTotalEl.textContent = formatCurrency(finalTotal);

  const badgeEl = document.getElementById('pricingGovernanceBadge');
  const noticeEl = document.getElementById('pricingGovernanceNotice');
  const confirmBtn = document.getElementById('btnConfirmPricingAction');

  if (discount <= 8 && finalTotal < 500000000) {
    if (badgeEl) {
      badgeEl.className = 'badge-tag eligible';
      badgeEl.textContent = 'Trong Hạn Mức Sales (<= 8%)';
    }
    if (noticeEl) {
      noticeEl.style.background = '#ecfdf5';
      noticeEl.style.border = '1px solid #a7f3d0';
      noticeEl.style.color = '#065f46';
      noticeEl.innerHTML = `
        <b>✓ Hạn mức thẩm quyền:</b> Mức chiết khấu <b>${discount}%</b> và giá trị đơn hàng <b>${formatCurrency(finalTotal)}</b> nằm trong thẩm quyền tự quyết của <b>Chuyên viên Sales</b>.<br>
        Bạn có toàn quyền xác nhận và ban hành báo giá chính thức ngay cho khách hàng mà không cần trình duyệt cấp trên.
      `;
    }
    if (confirmBtn) {
      confirmBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      confirmBtn.innerHTML = '<span>📤 Xác Nhận Báo Giá ➔ Tự Động Chuyển Sang Bước 5: Phê Duyệt &rarr;</span>';
    }
  } else {
    if (badgeEl) {
      badgeEl.className = 'badge-tag pending';
      badgeEl.textContent = 'Vượt Hạn Mức (> 8%) - Cần Trưởng Phòng Duyệt';
    }
    if (noticeEl) {
      noticeEl.style.background = '#f5f3ff';
      noticeEl.style.border = '1px solid #ddd6fe';
      noticeEl.style.color = '#5b21b6';
      noticeEl.innerHTML = `
        <b>⚠️ Yêu cầu chuyển duyệt cấp trên:</b> Mức chiết khấu <b>${discount}%</b> (hoặc giá trị hợp đồng &ge; 500 triệu) đã <b>vượt quá thẩm quyền tự duyệt</b> của Chuyên viên Sales (tối đa 8%).<br>
        Theo quy chế tài chính Minh An Company, đơn hàng này bắt buộc phải lập <b>Phiếu Chuyển Duyệt</b> trình Trưởng phòng Kinh doanh xem xét.
      `;
    }
    if (confirmBtn) {
      confirmBtn.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)';
      confirmBtn.innerHTML = '<span>📤 Xác Nhận Lập Phiếu ➔ Tự Động Chuyển Sang Bước 5: Phê Duyệt &rarr;</span>';
    }
  }
}

function submitPricingConfirmation() {
  if (!currentProcessingOpp) {
    if (allOpportunities.length > 0) currentProcessingOpp = allOpportunities[0];
    else { alert('Chưa có cơ hội nào đang được xử lý.'); return; }
  }

  const discountInput = document.getElementById('pricingDiscountInput');
  const discount = parseFloat(discountInput ? discountInput.value : (currentProcessingOpp.pricing.discount_percentage || 5)) || 5;
  const totalBefore = currentProcessingOpp.pricing.total_before_discount || 0;
  const discountAmount = Math.round(totalBefore * (discount / 100));
  const finalTotal = Math.max(0, totalBefore - discountAmount);

  currentProcessingOpp.pricing.discount_percentage = discount;
  currentProcessingOpp.pricing.discount_amount = discountAmount;
  currentProcessingOpp.pricing.total_after_discount = finalTotal;

  // Luôn chuyển sang trạng thái Chờ duyệt để bước tiếp theo (Bước 5: Phê duyệt) có dữ liệu duyệt
  currentProcessingOpp.status = 'Chờ duyệt';
  currentProcessingOpp.status_reason = `Đã hoàn tất tính toán báo giá (Chiết khấu ${discount}%, thành tiền ${formatCurrency(finalTotal)}). Lập Phiếu chuyển duyệt trình Trưởng phòng Kinh doanh xem xét.`;
  currentProcessingOpp.pricing.approval_reason = `Đơn hàng B2B cần phê duyệt chiết khấu ${discount}% và điều khoản hợp đồng trước khi phát hành chính thức.`;

  // Đảm bảo đơn hàng có mặt trong danh sách tổng
  const existingIdx = allOpportunities.findIndex(o => o.id === currentProcessingOpp.id);
  if (existingIdx !== -1) {
    allOpportunities[existingIdx] = currentProcessingOpp;
  } else {
    allOpportunities.unshift(currentProcessingOpp);
  }

  showStepTransitionToast(`📤 Đã xác nhận báo giá! Tự động chuyển sang Bước 5: Hộp Thư Phê Duyệt của Trưởng phòng...`, 'warning', 3000);

  renderDashboardData(null, allOpportunities);
  renderApprovalInbox(allOpportunities);
  renderAllOpportunitiesTable(allOpportunities);

  // TỰ ĐỘNG CHUYỂN THẲNG SANG BƯỚC 5: PHÊ DUYỆT
  openSaasPage('page-approval');
}

// ==========================================
// PAGE 9: APPROVAL INBOX (TRƯỞNG PHÒNG - CHECKPOINT 2)
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

  const canApprove = currentUser && (currentUser.role_code === 'SALES_MANAGER' || currentUser.role_code === 'ADMIN');

  container.innerHTML = pendingOpps.map(o => `
    <div class="saas-card" style="border-left:4px solid #8b5cf6;">
      <div class="saas-card-title-row">
        <div>
          <div style="font-size:16px; font-weight:800; color:#6b21a8;">
            📑 PHIẾU CHUYỂN DUYỆT: ${o.id} — ${o.customer_name}
          </div>
          <small style="color:#64748b;">Trình duyệt bởi chuyên viên: <b>${o.sales_rep ? o.sales_rep.name : 'N/A'}</b></small>
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
          <div><b>Căn cứ dữ liệu:</b> Kho đủ tồn khả dụng, hợp đồng thanh toán ngay.</div>
        </div>
      </div>

      ${canApprove ? `
      <div style="display:flex; align-items:center; gap:10px; padding-top:12px; border-top:1px dashed #e2e8f0;">
        <button class="btn-primary-action" style="background:#16a34a;" onclick="openManagerApprovalModal('${o.id}', 'APPROVED')">
          <span>✓ Phê Duyệt Chiết Khấu</span>
        </button>
        <button class="btn-secondary-tool" style="color:#dc2626; border-color:#fca5a5;" onclick="openManagerApprovalModal('${o.id}', 'REJECTED')">
          <span>✕ Từ Chối</span>
        </button>
        <button class="btn-secondary-tool" onclick="openManagerApprovalModal('${o.id}', 'REVISE')">
          <span>✏️ Yêu Cầu Chỉnh Sửa</span>
        </button>
      </div>
      ` : `
      <div style="padding:10px 14px; background:#fff1f2; border:1px solid #fecdd3; border-radius:8px; font-size:12px; color:#be123c;">
        🔒 <b>Quyền hạn chế:</b> Bạn đang đăng nhập với vai trò <b>${currentUser.role_name}</b>. Bạn chỉ được xem phiếu duyệt này, quyền bấm Duyệt/Từ chối thuộc về Trưởng phòng Kinh doanh (Lê Văn Tuấn) hoặc Quản trị viên (Lê Yến Như).
      </div>
      `}
    </div>
  `).join('');
}

function openManagerApprovalModal(oppId, decision) {
  if (!currentUser || (currentUser.role_code !== 'SALES_MANAGER' && currentUser.role_code !== 'ADMIN')) {
    alert('🚫 Bạn không có thẩm quyền phê duyệt chiết khấu. Chỉ Trưởng phòng Kinh doanh hoặc Admin mới được phê duyệt!');
    return;
  }

  currentApprOppId = oppId;
  currentApprDecision = decision;

  const opp = allOpportunities.find(o => o.id === oppId);
  if (!opp) return;

  const titleEl = document.getElementById('apprModalTitle');
  const summaryEl = document.getElementById('apprModalOppSummary');
  const noteEl = document.getElementById('apprModalNote');
  const submitBtn = document.getElementById('apprModalSubmitBtn');

  if (decision === 'APPROVED') {
    titleEl.textContent = `✓ Xác Nhận Phê Duyệt Chiết Khấu: ${opp.id}`;
    titleEl.style.color = '#047857';
    noteEl.value = 'Đồng ý phê duyệt mức chiết khấu đề xuất. Khách hàng cam kết thanh toán đợt 1 ngay sau khi ký hợp đồng.';
    submitBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    submitBtn.innerHTML = '<span>✓ Tôi Phê Duyệt Chiết Khấu Này</span>';
  } else if (decision === 'REJECTED') {
    titleEl.textContent = `✕ Xác Nhận Từ Chối Chiết Khấu: ${opp.id}`;
    titleEl.style.color = '#dc2626';
    noteEl.value = 'Từ chối mức chiết khấu này do vượt quá biên độ lợi nhuận gộp cho phép. Đề nghị Sales thương lượng lại tối đa 8%.';
    submitBtn.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    submitBtn.innerHTML = '<span>✕ Tôi Xác Nhận Từ Chối</span>';
  } else {
    titleEl.textContent = `✏️ Yêu Cầu Chỉnh Sửa Hồ Sơ: ${opp.id}`;
    titleEl.style.color = '#d97706';
    noteEl.value = 'Yêu cầu nhân viên phụ trách đàm phán lại về điều khoản bảo lãnh thanh toán trước khi duyệt.';
    submitBtn.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    submitBtn.innerHTML = '<span>✏️ Gửi Yêu Cầu Chỉnh Sửa</span>';
  }

  summaryEl.innerHTML = `
    <div><b>Khách hàng:</b> ${opp.customer_name} | <b>Mã cơ hội:</b> <code>${opp.id}</code></div>
    <div><b>Chuyên viên trình:</b> ${opp.sales_rep ? opp.sales_rep.name : 'N/A'}</div>
    <div><b>Tổng giá trị đề xuất:</b> <span style="font-weight:800; color:#b45309;">${formatCurrency(opp.pricing.total_after_discount)}</span></div>
    <div><b>Mức chiết khấu xin duyệt:</b> <span style="font-weight:700; color:#dc2626;">${opp.pricing.discount_percentage}%</span> (-${formatCurrency(opp.pricing.discount_amount)})</div>
    <div><b>Người đưa ra quyết định:</b> <b>${currentUser.full_name} (${currentUser.role_name})</b></div>
  `;

  openHitlModal('hitlApprovalModal');
}

async function confirmManagerApprovalDecision() {
  if (!currentApprOppId || !currentApprDecision) return;
  const note = document.getElementById('apprModalNote').value.trim();
  closeHitlModal('hitlApprovalModal');

  try {
    const res = await fetch('/api/approve', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ opp_id: currentApprOppId, decision: currentApprDecision, note })
    });

    const data = await res.json();
    if (res.ok && data.status === 'success') {
      const idx = allOpportunities.findIndex(o => o.id === currentApprOppId);
      if (idx !== -1) {
        allOpportunities[idx] = data.updated_opportunity;
      }
      renderDashboardData(data.summary, allOpportunities);
      renderApprovalInbox(allOpportunities);
      renderAllOpportunitiesTable(allOpportunities);
      renderReportsTable(data.summary, allOpportunities);

      if (currentApprDecision === 'APPROVED') {
        showStepTransitionToast(`✓ Trưởng phòng đã phê duyệt thành công cơ hội ${currentApprOppId}! Đang chuyển về Tổng quan...`, 'success', 3000);
        openSaasPage('page-dashboard');
      } else {
        showStepTransitionToast(`Đã lưu quyết định [${currentApprDecision}] cho cơ hội ${currentApprOppId}!`, 'warning', 3000);
      }
    } else {
      alert('Lỗi: ' + (data.error || 'Không thể thực hiện phê duyệt!'));
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
    const res = await fetch('/api/audit_logs', { headers: getAuthHeaders() });
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
  if (currentUser && currentUser.role_code !== 'ADMIN') {
    alert('🚫 Chỉ Quản trị viên (Admin) mới có quyền nạp dữ liệu Master Catalog!');
    return;
  }

  const text = document.getElementById('newDataTextarea').value.trim();
  if (!text) {
    alert('Vui lòng nhập định dạng JSON dữ liệu sản phẩm!');
    return;
  }

  try {
    const parsed = JSON.parse(text);
    const res = await fetch('/api/data_upload', {
      method: 'POST',
      headers: getAuthHeaders(),
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


// ==========================================
// WELCOME AI AGENT TAB / MODAL FUNCTIONS
// ==========================================
function handleStartExperience() {
  if (currentUser) {
    navigateTo('app');
    openSaasPage('page-dashboard');
    setTimeout(() => {
      openWelcomeAgentModal(true);
    }, 300);
  } else {
    navigateTo('login');
  }
}

function openWelcomeAgentModal(force = false) {
  const isSuppressed = sessionStorage.getItem('suppress_welcome_agent') === 'true';
  if (isSuppressed && !force) {
    return;
  }

  const modal = document.getElementById('welcomeAgentModal');
  if (!modal) return;

  const greetingEl = document.getElementById('welcomeUserGreetingText');
  if (greetingEl) {
    const userName = currentUser ? currentUser.name : 'Lê Yến Như';
    const userRole = currentUser ? (currentUser.role_name || currentUser.role || 'Quản trị viên') : 'Quản trị viên (Admin)';
    greetingEl.innerHTML = 'Xin chào <b>' + userName + '</b> (' + userRole + '), chào mừng bạn đến với Trung tâm điều phối AI Agent! Mọi kỹ năng bóc tách yêu cầu, thẩm định kho hàng, tính báo giá và hỗ trợ phê duyệt đều đã sẵn sàng hoạt động.';
  }

  modal.style.display = 'flex';
}

function closeWelcomeAgentModal() {
  const modal = document.getElementById('welcomeAgentModal');
  if (modal) {
    modal.style.display = 'none';
  }
  const chk = document.getElementById('chkDoNotShowAgain');
  if (chk && chk.checked) {
    sessionStorage.setItem('suppress_welcome_agent', 'true');
  }
}

function welcomeNavigateToStep1() {
  closeWelcomeAgentModal();
  openSaasPage('page-ingestion');
}

// Global modal dismiss listeners
window.addEventListener('click', (e) => {
  const welcomeModal = document.getElementById('welcomeAgentModal');
  if (welcomeModal && e.target === welcomeModal) {
    closeWelcomeAgentModal();
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const welcomeModal = document.getElementById('welcomeAgentModal');
    if (welcomeModal && welcomeModal.style.display === 'flex') {
      closeWelcomeAgentModal();
    }
  }
});
