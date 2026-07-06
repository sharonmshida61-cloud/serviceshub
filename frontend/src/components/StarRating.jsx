export function StarDisplay({ rating = 0, count }) {
  const rounded = Math.round(rating);
  return (
    <span className="biz-meta">
      <span className="stars">{"★".repeat(rounded) + "☆".repeat(5 - rounded)}</span>
      <span>
        {rating ? rating.toFixed(1) : "New"} {count != null && `(${count})`}
      </span>
    </span>
  );
}

export function StarInput({ value, onChange }) {
  return (
    <div className="rating-input">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`star ${n <= value ? "filled" : ""}`} onClick={() => onChange(n)}>
          ★
        </span>
      ))}
    </div>
  );
}
