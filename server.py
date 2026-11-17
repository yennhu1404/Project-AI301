import http.server
import socketserver
import json
import os
import urllib.parse
from pathlib import Path
from modules.b2b_agent import B2BOpportunityOrchestrator
from modules.b2b_catalog import OFFICIAL_CATALOG, SALES_REPRESENTATIVES, DISCOUNT_APPROVAL_POLICY

PORT = int(os.environ.get("PORT", 8888))
BASE_DIR = Path(__file__).resolve().parent
WEB_DIR = BASE_DIR / "web"

orchestrator = B2BOpportunityOrchestrator()

class B2BAgentHttpHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(WEB_DIR), **kwargs)

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        if path == "/api/summary":
            summary = orchestrator.get_dashboard_summary()
            self._send_json(summary)
            return

        elif path == "/api/opportunities":
            summary = orchestrator.get_dashboard_summary()
            res = {
                "summary": summary,
                "opportunities": orchestrator.opportunities
            }
            self._send_json(res)
            return

        elif path == "/api/catalog":
            res = {
                "catalog": OFFICIAL_CATALOG,
                "sales_reps": SALES_REPRESENTATIVES,
                "policy": DISCOUNT_APPROVAL_POLICY
            }
            self._send_json(res)
            return

        elif path == "/api/audit_logs":
            self._send_json(orchestrator.audit_logs)
            return

        elif path.startswith("/api/opportunity/"):
            opp_id = path.split("/")[-1]
            found = [o for o in orchestrator.opportunities if o["id"] == opp_id]
            if found:
                self._send_json(found[0])
            else:
                self._send_error(404, "Opportunity not found")
            return

        elif path == "/api/export/csv":
            self.send_response(200)
            self.send_header("Content-Type", "text/csv; charset=utf-8")
            self.send_header("Content-Disposition", 'attachment; filename="MinhAn_B2B_Opportunities.csv"')
            self.end_headers()
            
            csv_lines = [
                "\ufeffMã Cơ Hội,Khách Hàng,Người Liên Hệ,Trạng Thái,Tổng Giá Trị (VNĐ),Chiết Khấu (%),Hạn Mức Ngân Sách,Hạn Chót (Ngày),Sales Phụ Trách,Lý Do Nghiệp Vụ"
            ]
            for o in orchestrator.opportunities:
                val = o["pricing"]["total_after_discount"]
                disc = o["pricing"]["discount_percentage"]
                budget = o["extracted"]["budget"] or "Chưa xác định"
                deadline = o["extracted"]["deadline_days"] or "Chưa xác định"
                csv_lines.append(
                    f'"{o["id"]}","{o["customer_name"]}","{o["contact_person"]}","{o["status"]}",{val},{disc},"{budget}","{deadline}","{o["sales_rep"]["name"]}","{o["status_reason"]}"'
                )
            self.wfile.write("\n".join(csv_lines).encode("utf-8"))
            return

        elif path.startswith("/api/export/word"):
            params = urllib.parse.parse_qs(parsed_url.query)
            opp_id = params.get("id", [None])[0]
            target_opps = [o for o in orchestrator.opportunities if o["id"] == opp_id] if opp_id else orchestrator.opportunities
            
            doc_html = self._generate_word_document(target_opps)
            self.send_response(200)
            self.send_header("Content-Type", "application/msword; charset=utf-8")
            fname = f"BaoCao_CoHoi_{opp_id}.doc" if opp_id else "BaoCao_TongHop_CoHoi_MinhAn.doc"
            self.send_header("Content-Disposition", f'attachment; filename="{fname}"')
            self.end_headers()
            self.wfile.write(doc_html.encode("utf-8"))
            return

        super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            payload = json.loads(post_data.decode('utf-8')) if post_data else {}
        except Exception:
            payload = {}

        if path == "/api/process_request":
            raw_text = payload.get("raw_text", "").strip()
            source = payload.get("source", "Email khách hàng")
            if not raw_text:
                self._send_error(400, "Nội dung yêu cầu không được để trống")
                return

            new_opp = orchestrator.process_b2b_opportunity(raw_text, source)
            summary = orchestrator.get_dashboard_summary()
            self._send_json({
                "status": "success",
                "opportunity": new_opp,
                "summary": summary
            })
            return

        elif path == "/api/approve":
            opp_id = payload.get("opp_id")
            decision = payload.get("decision", "APPROVED")  # 'APPROVED' / 'REJECTED'
            note = payload.get("note", "")

            success = orchestrator.manager_decide_approval(opp_id, decision, note)
            if success:
                summary = orchestrator.get_dashboard_summary()
                updated = [o for o in orchestrator.opportunities if o["id"] == opp_id][0]
                self._send_json({
                    "status": "success",
                    "decision": decision,
                    "updated_opportunity": updated,
                    "summary": summary
                })
            else:
                self._send_error(404, "Không tìm thấy cơ hội hoặc cơ hội không ở trạng thái Chờ duyệt")
            return

        elif path == "/api/reset_demo":
            orchestrator.__init__()
            self._send_json({"status": "reset_complete", "opportunities": orchestrator.opportunities})
            return

        else:
            self._send_error(404, "API endpoint not found")

    def _send_json(self, data):
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def _send_error(self, code, message):
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps({"error": message}, ensure_ascii=False).encode('utf-8'))

    def _generate_word_document(self, opp_list):
        rows = ""
        for o in opp_list:
            items_str = "<br>".join([f"• {it['name']} (SL: {it['requested_qty']}, Đơn giá: {it['unit_price']:,.0f} đ)" for it in o["validation"]["items"]])
            rows += f"""
            <tr>
                <td style="border:1px solid #ccc; padding:8px;"><b>{o['id']}</b><br>{o['created_at']}</td>
                <td style="border:1px solid #ccc; padding:8px;"><b>{o['customer_name']}</b><br>{o['contact_person']} ({o['email']})</td>
                <td style="border:1px solid #ccc; padding:8px;">{items_str}</td>
                <td style="border:1px solid #ccc; padding:8px;"><b>{o['pricing']['total_after_discount']:,.0f} đ</b><br><small>CK: {o['pricing']['discount_percentage']}%</small></td>
                <td style="border:1px solid #ccc; padding:8px;"><span style="color:#d9534f; font-weight:bold;">{o['status']}</span></td>
                <td style="border:1px solid #ccc; padding:8px;">{o['status_reason']}</td>
            </tr>
            """

        html = f"""
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><title>Báo Cáo Cơ Hội Bán Hàng B2B - Minh An Company</title>
        <style>
            body {{ font-family: 'Times New Roman', serif; margin: 30px; }}
            h1 {{ color: #b8255f; text-align: center; }}
            h2 {{ color: #333; }}
            table {{ width: 100%; border-collapse: collapse; margin-top: 20px; }}
            th {{ background: #fdf2f4; border: 1px solid #ccc; padding: 10px; font-weight: bold; }}
        </style>
        </head>
        <body>
            <h1>CÔNG TY CÔNG NGHỆ MINH AN - BÁO CÁO CƠ HỘI BÁN HÀNG B2B</h1>
            <p style="text-align:center; font-style: italic;">Hệ thống AI Agent Xử lý Cơ hội Bán hàng B2B | Ngày trích xuất: {datetime.datetime.now().strftime('%d/%m/%Y %H:%M')}</p>
            <hr/>
            <h2>1. Danh Sách Cơ Hội Bán Hàng Được Xử Lý</h2>
            <table>
                <thead>
                    <tr>
                        <th>Mã Cơ Hội</th>
                        <th>Khách Hàng</th>
                        <th>Danh Mục Hàng Hóa</th>
                        <th>Tổng Giá Trị</th>
                        <th>Trạng Thái</th>
                        <th>Căn Cứ Nghiệp Vụ</th>
                    </tr>
                </thead>
                <tbody>
                    {rows}
                </tbody>
            </table>
            <br/><br/>
            <table style="width:100%; border:none;">
                <tr>
                    <td style="text-align:center; width:50%;"><b>Chuyên Viên Kinh Doanh</b><br><br><br><br>(Ký và ghi rõ họ tên)</td>
                    <td style="text-align:center; width:50%;"><b>Trưởng Phòng Kinh Doanh</b><br><br><br><br><b>Lê Văn Tuấn</b></td>
                </tr>
            </table>
        </body>
        </html>
        """
        import datetime
        return html

class ReusableThreadingServer(socketserver.ThreadingMixIn, socketserver.TCPServer):
    allow_reuse_address = True

def main():
    print(f"🚀 Minh An B2B AI Agent Server đang chạy tại: http://localhost:{PORT}")
    with ReusableThreadingServer(("0.0.0.0", PORT), B2BAgentHttpHandler) as httpd:
        print(f"✅ Sẵn sàng phục vụ tại http://localhost:{PORT}")
        httpd.serve_forever()

if __name__ == "__main__":
    main()
