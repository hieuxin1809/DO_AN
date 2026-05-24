function formatMoney(money) {
    // Guard null/undefined/NaN → hiển thị 0 thay vì "NaN ₫"
    const n = (money == null || isNaN(Number(money))) ? 0 : Number(money);
    const VND = new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    });
    return VND.format(n);
}


export {formatMoney}