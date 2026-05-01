import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {getMethod, deleteMethod} from '../../services/request';

const CenterAdmin = () => {
    const [items, setItems] = useState([]);

    useEffect(() => {
        getCenters();
    }, []);

    const getCenters = async() =>{
        var response = await getMethod('/api/center/public/find-all');
        var result = await response.json();
        setItems(result);
    };

    async function deleteData(id){
        var con = window.confirm("Bạn chắc chắn muốn xóa trung tâm này?");
        if (con === false) {
            return;
        }
        var response = await deleteMethod('/api/center/admin/delete?id='+id)
        if (response.status < 300) {
            toast.success("Xóa thành công!");
            getCenters();
        } else {
            if (response.status === 417) {
                var result = await response.json()
                toast.warning(result.defaultMessage);
            } else {
                toast.error("Xóa thất bại!");
            }
        }
    }

    return (
        <>
            <div className="row">
                <div className="col-md-3 col-sm-6 col-6">
                    <a href='add-center' className="btn btn-primary">
                        <i className="fa fa-plus"></i> Thêm trung tâm
                    </a>
                </div>
            </div>
            <div className="tablediv">
                <div className="headertable">
                    <span className="lbtable">Danh sách Trung tâm tiêm</span>
                </div>
                <div className="divcontenttable">
                    <table id="example" className="table table-bordered">
                        <thead>
                            <tr>
                                <th>Id</th>
                                <th>Tên trung tâm</th>
                                <th>Thành phố</th>
                                <th>Quận/Huyện</th>
                                <th>Phường/Xã</th>
                                <th>Địa chỉ</th>
                                <th>Hành động</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr key={item.id}>
                                    <td>{item.id}</td>
                                    <td>{item.centerName}</td>
                                    <td>{item.city}</td>
                                    <td>{item.district}</td>
                                    <td>{item.ward}</td>
                                    <td>{item.street}</td>
                                    <td>
                                    <a href={'add-center?id='+item.id} className="edit-btn"><i className='fa fa-edit'></i></a>
                                    <button onClick={()=>deleteData(item.id)} className="delete-btn"><i className='fa fa-trash'></i></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
};

export default CenterAdmin;
