import { NavLink } from "react-router-dom";
import "../styles/Footer.css";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <p>منصّة لتطوير مهارات الكتابة لدى الطلاب.</p>
        <NavLink className="footer-link" to="/about">
          من نحن والروابط
        </NavLink>
      </div>
    </footer>
  );
}
