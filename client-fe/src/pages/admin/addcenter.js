import { useState, useEffect } from 'react';
import {toast } from 'react-toastify';
import Swal from 'sweetalert2'
import 'react-toastify/dist/ReactToastify.css';
import {getMethod, postMethodPayload} from '../../services/request';

async function saveCenter(event) {
    event.preventDefault();
    var uls = new URL(document.URL)
    var id = uls.searchParams.get("id");
    
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

const AddCenterAdmin = ()=>{
    const [item, setItem] = useState(null);

    useEffect(()=>{
        const getCenter = async() =>{
            var uls = new URL(document.URL)
            var id = uls.searchParams.get("id");
            if(id != null){
                var response = await getMethod('/api/center/admin/find-by-id?id=' + id);
                var result = await response.json();
                setItem(result)
            }
        };
        getCenter();
    }, []);

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
                    <input name='centerName' defaultValue={item?.centerName} type='text' className='form-control' required/>
                    
                    <label className='lbadd-admin'>Thành phố / Tỉnh</label>
                    <input name='city' defaultValue={item?.city} type='text' className='form-control' required/>

                    <label className='lbadd-admin'>Quận / Huyện</label>
                    <input name='district' defaultValue={item?.district} type='text' className='form-control' required/>
                    
                    <label className='lbadd-admin'>Phường / Xã</label>
                    <input name='ward' defaultValue={item?.ward} type='text' className='form-control' required/>

                    <label className='lbadd-admin'>Số nhà, Tên đường</label>
                    <input name='street' defaultValue={item?.street} type='text' className='form-control' required/>
                    
                    <button className='btn btn-primary form-control' style={{marginTop: '20px'}}>
                        {item == null ? 'Thêm trung tâm' : 'Cập nhật trung tâm'}
                    </button>
                </div>
            </form>
        </>
    );
}

export default AddCenterAdmin;
