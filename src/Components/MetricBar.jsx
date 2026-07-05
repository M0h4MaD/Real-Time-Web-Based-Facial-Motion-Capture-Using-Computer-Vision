
import './styles/MetricBar.css'; 

export default function MetricBar({ label, value }) {
  // حساب النسبة المئوية للـ CSS
  const percentage = (value * 100).toFixed(0);

  return (
    <div className="metric-row">
      <div className="metric-label">
        <span>{label}</span>
        <span>{percentage}%</span>
      </div>
      <div className="progress-bar-bg">
        <div 
          className="progress-bar-fill" 
          style={{ width: `${percentage}%` }} 
        />
      </div>
    </div>
  );
}