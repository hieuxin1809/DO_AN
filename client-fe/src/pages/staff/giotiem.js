import { useState, useEffect } from 'react'
import ReactPaginate from 'react-paginate';
import {toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import $ from 'jquery'; 
import DataTable from 'datatables.net-dt';
import Swal from 'sweetalert2'
import {getMethod, deleteMethod, postMethodPayload} from '../../services/request';

const AdminGioTiemChung = ({lichtiem})=>{
    const [listNgay, setListNgay] = useState([]);
    const [items, setItems] = useState([]);
    const [soLuongDefault, setSoLuongDefault] = useState(1);
    const [tongHienTai, setTongHienTai] = useState(0);

    useEffect(()=>{
        if(lichtiem != null){
            var startDate = lichtiem.startDate
            var endDate = lichtiem.endDate
            let dates = [];
            let currentDate = new Date(startDate);
            while (currentDate <= new Date(endDate)) {
                let year = currentDate.getFullYear();
                let month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Tháng bắt đầu từ 0 nên +1
                let day = String(currentDate.getDate()).padStart(2, '0');
        
                dates.push(`${year}-${month}-${day}`);
                currentDate.setDate(currentDate.getDate() + 1);
            }
            setListNgay(dates)
            setSoLuongDefault(lichtiem.limitPeople / dates.length)
            loadGioTiem(lichtiem.id)
        }
        
    }, [lichtiem]);
    
    async function taoGioTiem(index, date){
        var payload = {
            "scheduleId":lichtiem.id,
            "date":date,
            "startTime":document.getElementById("giobatdau"+index).value,
            "endTime":document.getElementById("gioketthuc"+index).value,
            "numHour":document.getElementById("sogiomoica"+index).value,
            "maxPeople":document.getElementById("soluongnguoitiem"+index).value,
        }
        var res = await postMethodPayload('/api/vaccine-schedule-time/admin/create-multiple', payload)
        if (res.status < 300) {
            toast.success("Tạo thành công");
            loadGioTiem(lichtiem.id)
        } else {
            if(res.status == 417){
                var result = await res.json();
                toast.warning(result.defaultMessage);
            }
            else{
                toast.error("Thêm thời gian tiêm thất bại");
            }
        }
    }

    async function loadGioTiem(idLich) {
        var response = await getMethod('/api/vaccine-schedule-time/all/find-by-schedule?idSchedule=' + idLich);
        var result = await response.json();
        setItems(result)
        var tong = 0;
        for(var i=0; i< result.length; i++){
            tong = Number(tong) + Number(result[i].limitPeople) 
        }
        setTongHienTai(tong)
    }


    async function capNhatGio(id){
        var st = document.getElementById("giobdupdate"+id).value.split(":")
        var ed = document.getElementById("gioktupdate"+id).value.split(":")
        var payload = {
            "id":id,
            "start":st[0]+":"+st[1],
            "end":ed[0]+":"+ed[1],
            "limitPeople":document.getElementById("soluongupdate"+id).value,
        }
        var res = await postMethodPayload('/api/vaccine-schedule-time/admin/update', payload)
        if (res.status < 300) {
            toast.success("Cập nhật thành công");
            loadGioTiem(lichtiem.id)
        } else {
            if(res.status == 417){
                var result = await res.json();
                toast.warning(result.defaultMessage);
            }
            else{
                toast.error("Cập nhật thời gian tiêm thất bại");
            }
        }
    }
    
    function appendTr(index, date){
        var tablegiotiem = document.getElementById("tablegiotiem"+index);
        var tr = document.createElement('tr'); 
        tr.className = "transition-all";

        const tdtime = document.createElement('td'); 
        tdtime.className = "px-4";
        const divFlex = document.createElement('div');
        divFlex.className = "d-flex align-items-center gap-2";

        const inputStart = document.createElement('input'); 
        inputStart.type = 'time';
        inputStart.className = 'form-control form-control-sm text-center bg-light border-0 py-1';
        inputStart.style.width = '110px';
        divFlex.appendChild(inputStart);

        const gachNgang = document.createElement('span'); 
        gachNgang.textContent = ' to ';
        gachNgang.className = 'text-muted fw-bold';
        divFlex.appendChild(gachNgang);

        const inputEnd = document.createElement('input'); 
        inputEnd.type = 'time';
        inputEnd.className = 'form-control form-control-sm text-center bg-light border-0 py-1';
        inputEnd.style.width = '110px';
        divFlex.appendChild(inputEnd);

        tdtime.appendChild(divFlex);

        const soluong = document.createElement('td'); 
        const divCenter = document.createElement('div');
        divCenter.className = "d-flex justify-content-center";

        const inputSoLuong = document.createElement('input'); 
        inputSoLuong.type = 'number';
        inputSoLuong.className = 'form-control form-control-sm text-center bg-light border-0 py-1';
        inputSoLuong.style.width = '90px';
        divCenter.appendChild(inputSoLuong);
        soluong.appendChild(divCenter);

        const thaction = document.createElement('td'); 
        const divActions = document.createElement('div');
        divActions.className = "d-flex justify-content-center gap-1";

        const btnSave = document.createElement('button');
        btnSave.className = "btn btn-sm btn-action btn-outline-success border-0 rounded-circle";
        btnSave.innerHTML = '<i class="fa fa-save"></i>';
        btnSave.title = "Lưu ca";
        btnSave.onclick = function(){
            addSingle(inputStart, inputEnd, inputSoLuong, date);
        }

        const btnDelete = document.createElement('button');
        btnDelete.className = "btn btn-sm btn-action btn-outline-danger border-0 rounded-circle";
        btnDelete.innerHTML = '<i class="fa fa-trash"></i>';
        btnDelete.title = "Xóa ca";
        btnDelete.onclick = function(){
            xoaTam(tr);
        }

        divActions.appendChild(btnSave);
        divActions.appendChild(btnDelete);
        thaction.appendChild(divActions);
        
        tr.appendChild(tdtime);
        tr.appendChild(soluong);
        tr.appendChild(thaction);
        tablegiotiem.appendChild(tr);
    }
    

    function xoaTam(e){
        e.remove();
    }

    async function addSingle(start, end, soluong, date){
        var payload = {
            start: start.value,
            end: end.value,
            limitPeople: soluong.value,
            injectDate: date,
            vaccineSchedule: {
                id:lichtiem.id
            },
        }
        var res = await postMethodPayload('/api/vaccine-schedule-time/admin/create', payload)
        if (res.status < 300) {
            toast.success("Tạo thành công");
            loadGioTiem(lichtiem.id)
        } else {
            if(res.status == 417){
                var result = await res.json();
                toast.warning(result.defaultMessage);
            }
            else{
                toast.error("Thêm thời gian tiêm thất bại");
            }
        }
    }

    async function deleteGioTiem(id){
        var con = window.confirm("Bạn chắc chắn muốn xóa giờ tiêm này?");
        if (con == false) {
            return;
        }
        const res = await deleteMethod('/api/vaccine-schedule-time/admin/delete?id=' + id)
        if (res.status < 300) {
            toast.success("Xóa thành công!");
            loadGioTiem(lichtiem.id)
        }
        else {
            if(res.status == 417){
                var result = await res.json();
                toast.warning(result.defaultMessage);
            }
            else{
                toast.error("Xóa thời gian tiêm thất bại");
            }
        }
    }

    const modalStyles = `
        .bg-primary-light { background-color: rgba(13, 110, 253, 0.08) !important; }
        .bg-success-light { background-color: rgba(25, 135, 84, 0.08) !important; }
        .bg-info-light { background-color: rgba(13, 202, 240, 0.08) !important; }
        .bg-warning-light { background-color: rgba(255, 193, 7, 0.08) !important; }
        
        .modal-content {
            border: none !important;
            border-radius: 16px !important;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15) !important;
        }
        
        .card {
            transition: all 0.3s ease;
        }
        
        .card:hover {
            box-shadow: 0 8px 20px rgba(0,0,0,0.04) !important;
        }
        
        .table th {
            font-size: 0.8rem !important;
            text-transform: uppercase !important;
            letter-spacing: 0.5px !important;
            font-weight: 700 !important;
            color: #64748b !important;
            border-bottom: 2px solid #e2e8f0 !important;
        }
        
        .btn-action {
            width: 32px;
            height: 32px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            transition: all 0.2s ease-in-out;
        }
        
        .btn-action:hover {
            transform: translateY(-2px);
        }
        
        .form-control:focus {
            border-color: #3b82f6 !important;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15) !important;
        }
        
        input[type="time"]::-webkit-calendar-picker-indicator {
            cursor: pointer;
            opacity: 0.6;
        }
        
        input[type="time"]::-webkit-calendar-picker-indicator:hover {
            opacity: 1;
        }
        
        .transition-all {
            transition: all 0.2s ease-in-out;
        }
    `;

    return (
    <div className="modal fade" id="modalGioTiem" tabIndex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <style dangerouslySetInnerHTML={{ __html: modalStyles }} />
        <div className="modal-dialog modal-xl">
            <div className="modal-content">
                <div className="modal-header border-bottom-0 pb-0">
                    <div className="w-100">
                        <div className="d-flex align-items-center justify-content-between">
                            <h4 className="modal-title fw-bold text-dark d-flex align-items-center" id="exampleModalLabel">
                                <i className="fa fa-clock text-primary me-2"></i> Cấu hình khung giờ tiêm chủng
                            </h4>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <p className="text-muted mb-3 mt-1">Thiết lập thời gian và giới hạn số lượng tiêm chủng theo từng ngày</p>
                        
                        {/* Info Pills */}
                        <div className="d-flex flex-wrap gap-2 mb-3">
                            <span className="badge bg-primary-light text-primary px-3 py-2 rounded-pill font-semibold">
                                <i className="fa fa-syringe me-1"></i> Vaccine: <strong className="text-dark">{lichtiem?.vaccine.name}</strong>
                            </span>
                            <span className="badge bg-success-light text-success px-3 py-2 rounded-pill">
                                <i className="fa fa-list-ol me-1"></i> Kế hoạch: <strong className="text-dark">{lichtiem?.limitPeople} mũi</strong>
                            </span>
                            <span className="badge bg-info-light text-info px-3 py-2 rounded-pill">
                                <i className="fa fa-calculator me-1"></i> Định mức: <strong className="text-dark">{soLuongDefault.toFixed(1)} mũi/ngày</strong>
                            </span>
                            <span className="badge bg-warning-light text-warning px-3 py-2 rounded-pill">
                                <i className="fa fa-chart-line me-1"></i> Đã cấu hình: <strong className="text-dark">{tongHienTai} / {lichtiem?.limitPeople} mũi</strong>
                            </span>
                        </div>
                    </div>
                </div>
                <div className="modal-body px-4 py-2" id='noidungtimeschedule'>
                {listNgay.map((item, index)=>{
                    return (
                        <div key={index} className="card shadow-sm border-0 mb-4 overflow-hidden rounded-3">
                            {/* Card Header for Date */}
                            <div className="card-header bg-light border-0 py-3 px-4 d-flex justify-content-between align-items-center">
                                <span className="fs-5 fw-bold text-secondary d-flex align-items-center">
                                    <i className="fa fa-calendar-alt text-primary me-2"></i> Ngày tiêm: <span className="text-dark ms-2">{item}</span>
                                </span>
                                <span className="badge bg-secondary rounded-pill px-3 py-2">
                                    Ngày thứ {index + 1}
                                </span>
                            </div>

                            {/* Card Body */}
                            <div className="card-body p-4">
                                {/* Generation Form */}
                                <div className="row g-3 align-items-end mb-4">
                                    <div className="col-md-2">
                                        <label className="form-label text-muted small fw-bold mb-1">Giờ bắt đầu</label>
                                        <div className="input-group input-group-sm">
                                            <span className="input-group-text bg-white border-end-0"><i className="fa fa-clock text-muted"></i></span>
                                            <input id={'giobatdau'+index} defaultValue='08:00' className='form-control border-start-0 ps-0' type='time'/>
                                        </div>
                                    </div>
                                    <div className="col-md-2">
                                        <label className="form-label text-muted small fw-bold mb-1">Giờ kết thúc</label>
                                        <div className="input-group input-group-sm">
                                            <span className="input-group-text bg-white border-end-0"><i className="fa fa-clock text-muted"></i></span>
                                            <input id={'gioketthuc'+index} defaultValue='18:00' className='form-control border-start-0 ps-0' type='time'/>
                                        </div>
                                    </div>
                                    <div className="col-md-2">
                                        <label className="form-label text-muted small fw-bold mb-1">Số giờ mỗi ca tiêm</label>
                                        <div className="input-group input-group-sm">
                                            <span className="input-group-text bg-white border-end-0"><i className="fa fa-hourglass-half text-muted"></i></span>
                                            <input id={'sogiomoica'+index} defaultValue={1} min={1} className='form-control border-start-0 ps-0' type='number'/>
                                        </div>
                                    </div>
                                    <div className="col-md-2">
                                        <label className="form-label text-muted small fw-bold mb-1">Số lượng người tiêm</label>
                                        <div className="input-group input-group-sm">
                                            <span className="input-group-text bg-white border-end-0"><i className="fa fa-users text-muted"></i></span>
                                            <input id={'soluongnguoitiem'+index} className='form-control border-start-0 ps-0' type='number' />
                                        </div>
                                    </div>
                                    <div className="col-md-4 d-flex gap-2">
                                        <button onClick={()=>taoGioTiem(index, item)} className='btn btn-primary btn-sm flex-fill d-flex align-items-center justify-content-center py-2'>
                                            <i className='fa fa-bolt me-1'></i> Tự động chia ca
                                        </button>
                                        <button onClick={()=>appendTr(index, item)} className='btn btn-outline-secondary btn-sm px-3 py-2' title="Thêm ca thủ công">
                                            <i className='fa fa-plus' ></i>
                                        </button>
                                    </div>
                                </div>

                                {/* Schedule Times Table */}
                                <div className="table-responsive rounded-3 border">
                                    <table className='table table-hover align-middle mb-0'>
                                        <thead className="table-light">
                                            <tr>
                                                <th className="py-3 px-4" style={{width: '50%'}}>Khung thời gian tiêm</th>
                                                <th className="py-3 text-center" style={{width: '30%'}}>Giới hạn số lượng (người)</th>
                                                <th className="py-3 text-center" style={{width: '20%'}}>Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody id={'tablegiotiem'+index}>
                                            {items.map((giotiem, idx)=>{
                                                if(giotiem.injectDate === item){
                                                    return (
                                                        <tr key={giotiem.id} className="transition-all">
                                                            <td className="px-4">
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <input id={'giobdupdate'+giotiem.id} type='time' defaultValue={giotiem.start} className="form-control form-control-sm text-center bg-light border-0 py-1" style={{width: '110px'}}/>
                                                                    <span className="text-muted fw-bold">to</span>
                                                                    <input id={'gioktupdate'+giotiem.id} type='time' defaultValue={giotiem.end} className="form-control form-control-sm text-center bg-light border-0 py-1" style={{width: '110px'}}/>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="d-flex justify-content-center">
                                                                    <input id={'soluongupdate'+giotiem.id} defaultValue={giotiem.limitPeople} className="form-control form-control-sm text-center bg-light border-0 py-1" style={{width: '90px'}} type="number"/>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <div className="d-flex justify-content-center gap-1">
                                                                    <button onClick={()=>capNhatGio(giotiem.id)} className="btn btn-sm btn-action btn-outline-success border-0 rounded-circle" title="Lưu thay đổi">
                                                                        <i className="fa fa-save"></i>
                                                                    </button>
                                                                    <button onClick={()=>deleteGioTiem(giotiem.id)} className="btn btn-sm btn-action btn-outline-danger border-0 rounded-circle" title="Xóa ca">
                                                                        <i className="fa fa-trash"></i>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                }
                                                return null;
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )
                })}
                </div>
            </div>
        </div>
    </div>
    );
}

export default AdminGioTiemChung;