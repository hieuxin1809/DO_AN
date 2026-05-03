import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2'
import 'react-toastify/dist/ReactToastify.css';
import { getMethod, postMethodPayload } from '../../services/request';

async function saveCenter(event) {
    event.preventDefault();
    var uls = new URL(document.URL)
    var id = uls.searchParams.get("id");
    
    // Vì ta đặt name='city', name='district', name='ward' cho thẻ select
    // nên event.target.elements vẫn lấy được value bình thường
    var payload = {
        "id": id,
        "centerName": event.target.elements.centerName.value,
        "city": event.target.elements.city.value,
        "district": event.target.elements.district.value,
        "ward": event.target.elements.ward.value,
        "street": event.target.elements.street.value,
    }

    var res = null;
    if(id == null){
        res = await postMethodPayload('/api/center/admin/create', payload)
    }
    else{
        res = await postMethodPayload('/api/center/admin/update', payload)
    }

    if (res.status < 300) {
        Swal.fire({
            title: "Thông báo",
            text: "Lưu thông tin thành công!",
            preConfirm: () => {
                window.location.href = 'center'
            }
        });
    } else {
        if(res.status === 417){
            var result = await res.json();
            toast.warning(result.defaultMessage);
        } else {
            toast.error("Thất bại");
        }
    }
}

const AddCenterAdmin = () => {
    const [item, setItem] = useState(null);

    // Thêm state để quản lý dữ liệu địa chỉ
    const [provinces, setProvinces] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [wards, setWards] = useState([]);

    // State lưu giá trị đang chọn
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedWard, setSelectedWard] = useState('');

    // Fetch dữ liệu từ API hành chính Việt Nam và Center đang edit
    useEffect(() => {
        const getCenter = async () => {
            var uls = new URL(document.URL)
            var id = uls.searchParams.get("id");
            if (id != null) {
                var response = await getMethod('/api/center/admin/find-by-id?id=' + id);
                var result = await response.json();
                setItem(result);
            }
        };
        getCenter();

        fetch('https://provinces.open-api.vn/api/?depth=3')
            .then(res => res.json())
            .then(data => setProvinces(data))
            .catch(err => console.error("Lỗi lấy API tỉnh thành: ", err));
    }, []);

    // Effect này chạy để gán lại giá trị cho các thẻ select khi đang ở chế độ Sửa (Edit)
    useEffect(() => {
        if (item && provinces.length > 0) {
            setSelectedCity(item.city);
            const province = provinces.find(p => p.name === item.city);
            if (province) {
                setDistricts(province.districts);
                setSelectedDistrict(item.district);
                const dist = province.districts.find(d => d.name === item.district);
                if (dist) {
                    setWards(dist.wards);
                    setSelectedWard(item.ward);
                }
            }
        }
    }, [item, provinces]);

    // Xử lý khi chọn Tỉnh/Thành
    const handleCityChange = (e) => {
        const cityName = e.target.value;
        setSelectedCity(cityName);
        const province = provinces.find(p => p.name === cityName);
        setDistricts(province ? province.districts : []);
        setWards([]); // Reset Phường/Xã
        setSelectedDistrict('');
        setSelectedWard('');
    };

    // Xử lý khi chọn Quận/Huyện
    const handleDistrictChange = (e) => {
        const distName = e.target.value;
        setSelectedDistrict(distName);
        const dist = districts.find(d => d.name === distName);
        setWards(dist ? dist.wards : []);
        setSelectedWard('');
    };

    return (
        <>
            <div className='row'>
                <div className='col-sm-6'>
                    <div className='headpageadmin'>
                        <span>{item == null ? 'Thêm trung tâm' : 'Cập nhật trung tâm'}</span>
                    </div>
                </div>
            </div>
            <form className='row' onSubmit={saveCenter} method='post'>
                <div className='col-sm-6'>
                    <label className='lbadd-admin'>Tên trung tâm</label>
                    <input name='centerName' defaultValue={item?.centerName} type='text' className='form-control' required />

                    <label className='lbadd-admin'>Thành phố / Tỉnh</label>
                    <select name='city' value={selectedCity} onChange={handleCityChange} className='form-control' required>
                        <option value="">-- Chọn Tỉnh/Thành phố --</option>
                        {provinces.map(p => (
                            <option key={p.code} value={p.name}>{p.name}</option>
                        ))}
                    </select>

                    <label className='lbadd-admin'>Quận / Huyện</label>
                    <select name='district' value={selectedDistrict} onChange={handleDistrictChange} className='form-control' required disabled={!selectedCity}>
                        <option value="">-- Chọn Quận/Huyện --</option>
                        {districts.map(d => (
                            <option key={d.code} value={d.name}>{d.name}</option>
                        ))}
                    </select>

                    <label className='lbadd-admin'>Phường / Xã</label>
                    <select name='ward' value={selectedWard} onChange={(e) => setSelectedWard(e.target.value)} className='form-control' required disabled={!selectedDistrict}>
                        <option value="">-- Chọn Phường/Xã --</option>
                        {wards.map(w => (
                            <option key={w.code} value={w.name}>{w.name}</option>
                        ))}
                    </select>

                    <label className='lbadd-admin'>Số nhà, Tên đường</label>
                    <input name='street' defaultValue={item?.street} type='text' className='form-control' required />

                    <button className='btn btn-primary form-control' style={{ marginTop: '20px' }}>
                        {item == null ? 'Thêm trung tâm' : 'Cập nhật trung tâm'}
                    </button>
                </div>
            </form>
        </>
    );
}

export default AddCenterAdmin;