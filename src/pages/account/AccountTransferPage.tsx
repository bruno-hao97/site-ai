export default function AccountTransferPage() {
  return (
    <div className="account-settings">
      <h1 className="account-content-title">↔ CHUYỂN TIỀN</h1>
      <section className="panel account-card">
        <p className="muted">Chuyển credit giữa các tài khoản trên nền tảng trungtamai.vn.</p>
        <form className="form account-form" onSubmit={(e) => e.preventDefault()}>
          <label className="field">
            <span className="label">ID NGƯỜI NHẬN</span>
            <input placeholder="id_base hoặc email" />
          </label>
          <label className="field">
            <span className="label">SỐ CREDIT</span>
            <input type="number" min={1} placeholder="100" />
          </label>
          <button type="submit" className="btn account-teal-btn" disabled>
            Chuyển (sắp có)
          </button>
        </form>
      </section>
    </div>
  );
}
