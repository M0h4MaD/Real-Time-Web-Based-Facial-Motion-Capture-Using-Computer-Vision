// src/Components/MetricBar.jsx
export default function MetricBar({ label, value }) {
  // 1. الحماية الأساسية: إذا كانت القيمة غير موجودة أو NaN نعتبرها 0
  const safeValue = isNaN(value) || value === undefined ? 0 : value;

  // 2. التحقق من نوع القيمة (هل هي دوران أم حركة وجه عادية؟)
  const isRotation = label.toLowerCase().includes("yaw");

  // 3. تحويل القيمة للرقم الذي سيظهر للمستخدم
  // الدوران: من راديان إلى درجات | الفم والعيون: من 0-1 إلى 0-100
  const displayValue = isRotation 
    ? Math.round(safeValue * (180 / Math.PI)) 
    : Math.round(safeValue * 100);

  // 4. حساب نسبة امتلاء شريط التقدم (يجب أن يكون دائماً بين 0 و 100)
  // الدوران: نأخذ القيمة المطلقة (اليمين واليسار يعبئان الشريط) بحد أقصى 90 درجة
  const progressWidth = isRotation
    ? Math.min((Math.abs(displayValue) / 90) * 100, 100)
    : Math.min(Math.max(displayValue, 0), 100);

  // 5. تجهيز النص النهائي مع الرمز المناسب
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