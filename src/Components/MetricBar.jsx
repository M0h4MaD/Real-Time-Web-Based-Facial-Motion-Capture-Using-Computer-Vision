// src/Components/MetricBar.jsx
export default function MetricBar({ label, value }) {
  // 1. الحماية الأساسية: إذا كانت القيمة غير موجودة أو NaN نعتبرها 0
  const safeValue = isNaN(value) || value === undefined ? 0 : value;

  // 2. التحقق من نوع القيمة (هل هي دوران أم حركة وجه عادية؟)
  const isRotation = label.toLowerCase().includes("yaw");

  // 3. تحويل القيمة للرقم الذي سيظهر للمستخدم
  const displayValue = isRotation 
    ? Math.round(safeValue * (180 / Math.PI)) 
    : Math.round(safeValue * 100);

  // 4. حساب نسبة امتلاء شريط التقدم بحد أقصى 90 درجة للدوران
  const progressWidth = isRotation
    ? Math.min((Math.abs(displayValue) / 90) * 100, 100)
    : Math.min(Math.max(displayValue, 0), 100);

  // 5. تجهيز النص النهائي
  const formattedText = isRotation ? `${displayValue}°` : `${displayValue}%`;

  return (
    <div className="metric-container">
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        <span className="metric-value">{formattedText}</span>
      </div>
      <div className="metric-track">
        <div 
          className="metric-fill" 
          style={{ width: `${progressWidth}%` }}
        ></div>
      </div>
    </div>
  );
}