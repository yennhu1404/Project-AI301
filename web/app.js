/**
 * MINH AN COMPANY - B2B AI AGENT SYSTEM
 * Client-side Controller & Interactive Pipeline
 */

let allOpportunities = [];
let activeOpportunity = null;
let statusPieChartInstance = null;

const TEST_CASES_DATA = {
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
  initApp();
  loadTestCase(1);
});

async function initApp() {
  try {
    const res = await fetch('/api/opportunities');
    const data = await res.json();
    allOpportunities = data.opportunities || [];
    renderDashboard(data.summary, allOpportunities);
    
    if (allOpportunities.length > 0) {
      renderOpportunityDetail(allOpportunities[0]);
    }

    loadAuditLogs();
    renderStaticPipelineSteps();
  } catch (err) {
    console.error('Lỗi khởi tạo hệ thống:', err);
  }
}

function startExperience() {
  const mainNav = document.getElementById('mainNav');
  if (mainNav) {
    mainNav.scrollIntoView({ behavior: 'smooth' });
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    content.style.display = content.id === tabId ? 'block' : 'none';
  });

  if (tabId === 'tab-audit') {
    loadAuditLogs();
  }
}

function renderDashboard(summary, opps) {
  if (!summary) return;

  // 1. Update KPI Counters & Values
  document.getElementById('countEligible').textContent = summary.eligible.count;
  document.getElementById('valEligible').textContent = formatCurrency(summary.eligible.total_value);

  document.getElementById('countPending').textContent = summary.pending_approval.count;
  document.getElementById('valPending').textContent = formatCurrency(summary.pending_approval.total_value);

  document.getElementById('countMissing').textContent = summary.missing_info.count;
  document.getElementById('countUnfulfilled').textContent = summary.unfulfilled.count;

  document.getElementById('navBadgeTotal').textContent = opps.length;
  document.getElementById('oppsSubtitle').textContent = `Tổng ${opps.length} cơ hội | Minh An Company`;

  // 2. Render Table Rows
  const tbody = document.getElementById('oppsTableBody');
  tbody.innerHTML = '';

  opps.forEach(opp => {
    const tr = document.createElement('tr');
    const statusBadgeClass = getBadgeClass(opp.status);
    const formattedVal = opp.pricing.total_after_discount > 0 ? formatCurrency(opp.pricing.total_after_discount) : 'Chưa xác định';

    tr.innerHTML = `
      <td><b>${opp.id}</b></td>
      <td>
        <div style="font-weight:700;">${opp.customer_name}</div>
        <div style="font-size:11.5px; color:#64748b;">${opp.contact_person}</div>
      </td>
      <td>
        <span class="status-badge ${statusBadgeClass}">${opp.status}</span>
      </td>
      <td style="font-weight:700; color:#1e293b;">${formattedVal}</td>
      <td>${opp.sales_rep ? opp.sales_rep.name : 'Chưa gán'}</td>
      <td>
        <button class="btn-table-action" onclick="viewOpportunityDetail('${opp.id}')">Xem Chi Tiết &rarr;</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // 3. Render Status Donut Chart
  renderStatusPieChart(summary);
}

function renderStatusPieChart(summary) {
  const ctx = document.getElementById('statusPieChart');
  if (!ctx) return;

  if (statusPieChartInstance) {
    statusPieChartInstance.destroy();
  }

  const dataValues = [
    summary.eligible.count,
    summary.pending_approval.count,
    summary.missing_info.count,
    summary.unfulfilled.count
  ];

  statusPieChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Có thể tiếp tục', 'Chờ duyệt', 'Cần bổ sung', 'Chưa đáp ứng'],
      datasets: [{
        data: dataValues,
        backgroundColor: ['#10b981', '#8b5cf6', '#f59e0b', '#ef4444'],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            boxWidth: 12,
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '600' }
          }
        }
      },
      cutout: '65%'
    }
  });
}

function loadTestCase(tcNum, btnEl) {
  document.querySelectorAll('.test-case-card-btn').forEach(b => b.classList.remove('active'));
  if (btnEl) {
    btnEl.classList.add('active');
  } else {
    const defaultBtn = document.querySelectorAll('.test-case-card-btn')[tcNum - 1];
    if (defaultBtn) defaultBtn.classList.add('active');
  }

  const inputEl = document.getElementById('rawRequestInput');
  if (inputEl) {
    inputEl.value = TEST_CASES_DATA[tcNum] || '';
  }
}

async function executeAgentPipeline() {
  const rawText = document.getElementById('rawRequestInput').value.trim();
  if (!rawText) {
    alert('Vui lòng nhập hoặc chọn một kịch bản yêu cầu khách hàng.');
    return;
  }

  const statusBadge = document.getElementById('pipelineStatusBadge');
  statusBadge.className = 'status-badge badge-pending';
  statusBadge.textContent = 'AI Agent đang thực thi...';

  try {
    const res = await fetch('/api/process_request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text: rawText, source: 'AI Agent Studio Sandbox' })
    });

    const data = await res.json();
    if (data.status === 'success') {
      const opp = data.opportunity;
      allOpportunities.unshift(opp);
      renderDashboard(data.summary, allOpportunities);
      renderAnimatedPipelineSteps(opp);
      renderOpportunityDetail(opp);

      statusBadge.className = 'status-badge badge-eligible';
      statusBadge.textContent = `Hoàn thành: ${opp.status}`;
    } else {
      alert('Lỗi: ' + (data.error || 'Không thể xử lý'));
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối máy chủ');
  }
}

function renderStaticPipelineSteps() {
  const stepsContainer = document.getElementById('pipelineStepsList');
  if (!stepsContainer) return;

  const stepsDef = [
    { num: 1, title: 'Bước 1: Tiếp nhận yêu cầu', agent: 'Request Ingestion', desc: 'Ghi nhận nguồn dữ liệu (Email/Web Form), tạo mã định danh cơ hội và lưu timestamp.' },
    { num: 2, title: 'Bước 2: Phân loại & Trích xuất thông tin', agent: 'Skill 1: Request Analyzer', desc: 'Trích xuất tên khách hàng, người liên hệ, danh mục sản phẩm, số lượng, ngân sách, thời hạn và chiết khấu.' },
    { num: 3, title: 'Bước 3: Điểm quyết định 1 (Đầy đủ thông tin?)', agent: 'Validation Engine', desc: 'Kiểm tra các trường dữ liệu bắt buộc. Nếu thiếu, tự sinh câu hỏi làm rõ và chuyển trạng thái "Cần bổ sung".' },
    { num: 4, title: 'Bước 4: Tạo hồ sơ & Gán Sales phụ trách', agent: 'Opportunity Mgmt', desc: 'Khởi tạo hồ sơ cơ hội B2B chính thức và gán 1 trong 6 chuyên viên kinh doanh theo phân quyền.' },
    { num: 5, title: 'Bước 5: Thẩm định danh mục, tồn kho & giá', agent: 'Skill 2: Inventory Validator', desc: 'Đối chiếu Master Catalog, kiểm tra tồn kho khả dụng và so sánh thời gian giao hàng với hạn chót khách hàng.' },
    { num: 6, title: 'Bước 6: Tính giá & Kiểm tra thẩm quyền chiết khấu', agent: 'Skill 3: Pricing Calculator', desc: 'Tính tổng giá trị trước chiết khấu, áp dụng mức ưu đãi và kiểm tra hạn mức thẩm quyền (Sales <=5%, Trưởng phòng <=15%).' },
    { num: 7, title: 'Bước 7: Điểm quyết định 2 (Phân loại trạng thái)', agent: 'Decision Engine', desc: 'Xác định 1 trong 4 trạng thái: Có thể tiếp tục, Cần bổ sung thông tin, Chưa đáp ứng, hoặc Chờ duyệt.' },
    { num: 8, title: 'Bước 8: Trưởng phòng Kinh doanh phê duyệt', agent: 'Human Checkpoint 2', desc: 'Nếu vượt thẩm quyền, AI lập Phiếu chuyển duyệt trình Trưởng phòng duyệt. AI chỉ ghi nhận quyết định con người.' },
    { num: 9, title: 'Bước 9: Hoàn thiện hồ sơ & Bản nháp phản hồi', agent: 'Skill 4: Response Generator', desc: 'Tự động tạo dự thảo email phản hồi khách hàng và chuẩn hóa hồ sơ cơ hội B2B.' },
    { num: 10, title: 'Bước 10: Kết thúc & Bàn giao quản lý', agent: 'System Handoff', desc: 'Lưu toàn bộ nhật ký truy vết Audit Log và đồng bộ hóa báo cáo lên Dashboard quản trị.' }
  ];

  stepsContainer.innerHTML = stepsDef.map(s => `
    <div class="pipeline-step-item">
      <div class="step-num-badge">${s.num}</div>
      <div class="step-content">
        <div class="step-header-row">
          <span class="step-title">${s.title}</span>
          <span class="step-agent-tag">${s.agent}</span>
        </div>
        <div class="step-detail">${s.desc}</div>
      </div>
    </div>
  `).join('');
}

function renderAnimatedPipelineSteps(opp) {
  const stepsContainer = document.getElementById('pipelineStepsList');
  if (!stepsContainer) return;

  const itemsList = opp.validation.items.map(it => `${it.name} (SL: ${it.requested_qty}, Kho: ${it.stock_available})`).join(', ');

  const dynamicSteps = [
    { num: 1, title: 'Bước 1: Tiếp nhận yêu cầu', agent: 'Request Ingestion', detail: `Đã ghi nhận yêu cầu từ ${opp.source}. Tạo mã hồ sơ: ${opp.id}.` },
    { num: 2, title: 'Bước 2: Phân loại & Trích xuất thông tin', agent: 'Skill 1: Request Analyzer', detail: `Khách hàng: ${opp.customer_name} | Ngân sách: ${opp.extracted.budget ? formatCurrency(opp.extracted.budget) : 'Chưa rõ'} | Hạn: ${opp.extracted.deadline_days || 'Chưa rõ'} ngày.` },
    { num: 3, title: 'Bước 3: Điểm quyết định 1 (Kiểm tra thông tin)', agent: 'Validation Engine', detail: opp.missing_fields.length > 0 ? `Phát hiện thiếu: ${opp.missing_fields.join(', ')} &rarr; Chuyển nhánh Cần bổ sung.` : 'Thông tin đầy đủ 100% &rarr; Chuyển sang bước thẩm định.' },
    { num: 4, title: 'Bước 4: Tạo hồ sơ & Gán Sales', agent: 'Opportunity Mgmt', detail: `Đã gán chuyên viên phụ trách: ${opp.sales_rep.name} (${opp.sales_rep.email}).` },
    { num: 5, title: 'Bước 5: Thẩm định Tồn kho & Đơn giá', agent: 'Skill 2: Inventory Validator', detail: `Sản phẩm: ${itemsList}. Năng lực đáp ứng tồn kho: ${opp.validation.is_all_stock_sufficient ? 'ĐỦ' : 'THIẾU'}.` },
    { num: 6, title: 'Bước 6: Tính giá & Chính sách chiết khấu', agent: 'Skill 3: Pricing Calculator', detail: `${opp.pricing.math_formula}` },
    { num: 7, title: 'Bước 7: Điểm quyết định 2 (Phân loại)', agent: 'Decision Engine', detail: `Phân loại: [${opp.status}] — Căn cứ: ${opp.status_reason}` },
    { num: 8, title: 'Bước 8: Trình Trưởng phòng phê duyệt', agent: 'Human Checkpoint 2', detail: opp.approval_ticket ? `Đã lập Phiếu duyệt: ${opp.approval_ticket.ticket_id} trình ${opp.approval_ticket.approver_target}.` : 'Không vượt hạn mức, bỏ qua bước trình duyệt.' },
    { num: 9, title: 'Bước 9: Hoàn thiện hồ sơ & Dự thảo Email', agent: 'Skill 4: Response Generator', detail: 'Đã hoàn thiện dự thảo phản hồi khách hàng theo đúng tình trạng thực tế.' },
    { num: 10, title: 'Bước 10: Kết thúc & Bàn giao', agent: 'System Handoff', detail: 'Hồ sơ đã lưu trữ vào cơ sở dữ liệu và đồng bộ chỉ số Dashboard BI.' }
  ];

  stepsContainer.innerHTML = dynamicSteps.map(s => `
    <div class="pipeline-step-item" style="border-left: 4px solid #f43f5e;">
      <div class="step-num-badge" style="background:#e11d48; color:#fff;">${s.num}</div>
      <div class="step-content">
        <div class="step-header-row">
          <span class="step-title">${s.title}</span>
          <span class="step-agent-tag" style="background:#ffe4e6; color:#e11d48;">${s.agent}</span>
        </div>
        <div class="step-detail">${s.detail}</div>
      </div>
    </div>
  `).join('');
}

function viewOpportunityDetail(oppId) {
  const opp = allOpportunities.find(o => o.id === oppId);
  if (opp) {
    renderOpportunityDetail(opp);
    switchTab('tab-details');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  }
}

function renderOpportunityDetail(opp) {
  activeOpportunity = opp;

  document.getElementById('detOppId').textContent = opp.id;
  document.getElementById('detCustomerName').textContent = opp.customer_name;
  document.getElementById('detContactPerson').textContent = opp.contact_person || 'Đại diện Doanh nghiệp';
  document.getElementById('detEmail').textContent = opp.email || 'N/A';
  document.getElementById('detPhone').textContent = opp.phone || 'N/A';
  document.getElementById('detSalesRep').textContent = opp.sales_rep ? opp.sales_rep.name : 'Chưa gán';

  const statusBadge = document.getElementById('detStatusBadge');
  statusBadge.className = 'status-badge ' + getBadgeClass(opp.status);
  statusBadge.textContent = opp.status;

  document.getElementById('detCreatedTime').textContent = `Tiếp nhận: ${opp.created_at || 'Hôm nay'}`;

  // 1. Items Table
  const itemsTbody = document.getElementById('detItemsTableBody');
  itemsTbody.innerHTML = '';
  if (opp.validation && opp.validation.items) {
    opp.validation.items.forEach(it => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><b>${it.sku}</b></td>
        <td>${it.name}</td>
        <td>${it.requested_qty} chiếc</td>
        <td>${formatCurrency(it.unit_price)}</td>
        <td>${it.stock_available} chiếc</td>
        <td>${it.standard_lead_days ? it.standard_lead_days + ' ngày' : 'N/A'}</td>
        <td><span class="status-badge ${it.is_stock_ok ? 'badge-eligible' : 'badge-unfulfilled'}">${it.stock_status}</span></td>
      `;
      itemsTbody.appendChild(tr);
    });
  }

  // 2. Pricing Box
  document.getElementById('detTotalBefore').textContent = formatCurrency(opp.pricing.total_before_discount);
  document.getElementById('detDiscountPct').textContent = `${opp.pricing.discount_percentage}% (-${formatCurrency(opp.pricing.discount_amount)})`;
  document.getElementById('detTotalAfter').textContent = opp.pricing.total_after_discount > 0 ? formatCurrency(opp.pricing.total_after_discount) : 'Chưa xác định';
  document.getElementById('detMathFormula').textContent = opp.pricing.math_formula || 'Chưa có công thức';

  // 3. Draft Email
  document.getElementById('detDraftEmail').textContent = opp.draft_email || 'Chưa có dự thảo email.';

  // 4. Approval Ticket Box
  const ticketBox = document.getElementById('approvalTicketBox');
  if (opp.status === 'Chờ duyệt' && opp.approval_ticket) {
    ticketBox.style.display = 'block';
    document.getElementById('ticketSalesRep').textContent = opp.sales_rep.name;
    document.getElementById('ticketManager').textContent = `${opp.approval_ticket.approver_target} (${opp.approval_ticket.approver_title})`;
    document.getElementById('ticketReason').textContent = opp.approval_ticket.exceeded_reason;
    document.getElementById('ticketEvidence').textContent = opp.approval_ticket.data_evidence;
  } else {
    ticketBox.style.display = 'none';
  }
}

async function handleManagerApproval(decision) {
  if (!activeOpportunity) return;

  const note = prompt(decision === 'APPROVED' ? 'Ghi chú phê duyệt của Trưởng phòng:' : 'Lý do từ chối yêu cầu chiết khấu:', decision === 'APPROVED' ? 'Đồng ý phê duyệt mức chiết khấu hỗ trợ đối tác chiến lược.' : 'Mức chiết khấu không phù hợp biên lợi nhuận.');
  if (note === null) return;

  try {
    const res = await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        opp_id: activeOpportunity.id,
        decision: decision,
        note: note
      })
    });

    const data = await res.json();
    if (data.status === 'success') {
      alert(`Đã ghi nhận quyết định của Trưởng phòng: [${decision === 'APPROVED' ? 'PHÊ DUYỆT' : 'TỪ CHỐI'}]`);
      const idx = allOpportunities.findIndex(o => o.id === activeOpportunity.id);
      if (idx !== -1) {
        allOpportunities[idx] = data.updated_opportunity;
      }
      renderDashboard(data.summary, allOpportunities);
      renderOpportunityDetail(data.updated_opportunity);
    } else {
      alert('Không thể thực hiện phê duyệt: ' + data.error);
    }
  } catch (err) {
    console.error(err);
    alert('Lỗi kết nối máy chủ');
  }
}

async function loadAuditLogs() {
  try {
    const res = await fetch('/api/audit_logs');
    const logs = await res.json();
    const tbody = document.getElementById('auditTableBody');
    if (!tbody) return;

    tbody.innerHTML = logs.map(l => `
      <tr>
        <td style="font-family: monospace; font-size: 11px;">${l.timestamp}</td>
        <td><b>${l.opp_id}</b></td>
        <td>${l.step}</td>
        <td style="color: #e11d48; font-weight: 700;">${l.skill}</td>
        <td>${l.action}</td>
        <td style="font-size: 11.5px; color: #64748b;">${l.rule}</td>
        <td>${l.human_checkpoint ? '<span class="status-badge badge-pending">Có can thiệp</span>' : '<span style="color:#94a3b8;">Tự động</span>'}</td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Lỗi tải audit logs:', err);
  }
}

function exportWordReport() {
  const oppId = activeOpportunity ? activeOpportunity.id : '';
  window.open(`/api/export/word?id=${oppId}`, '_blank');
}

function exportCsvReport() {
  window.open('/api/export/csv', '_blank');
}

async function resetDemoData() {
  if (confirm('Khôi phục lại dữ liệu 4 Test Cases chuẩn ban đầu?')) {
    await fetch('/api/reset_demo', { method: 'POST' });
    initApp();
  }
}

function copyDraftEmail() {
  const text = document.getElementById('detDraftEmail').textContent;
  navigator.clipboard.writeText(text).then(() => {
    alert('Đã sao chép nội dung email vào Clipboard!');
  });
}

function formatCurrency(val) {
  if (!val || isNaN(val)) return '0 đ';
  return Number(val).toLocaleString('vi-VN') + ' đ';
}

function getBadgeClass(status) {
  switch (status) {
    case 'Có thể tiếp tục': return 'badge-eligible';
    case 'Cần bổ sung thông tin': return 'badge-missing';
    case 'Chưa đáp ứng': return 'badge-unfulfilled';
    case 'Chờ duyệt': return 'badge-pending';
    default: return 'badge-missing';
  }
}
