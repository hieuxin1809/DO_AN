import { useState, useEffect, useRef } from 'react'
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Swal from 'sweetalert2'
import { getMethod, postMethod, postMethodPayload, uploadSingleFile } from '../../../services/request';
import Select from 'react-select';
import { Editor } from '@tinymce/tinymce-react';

var linkbanner = '';
var description = '';

const StaffAddVaccine = () => {
    const [item, setItem] = useState(null);
    const [type, setType] = useState([]);
    const [manufacturer, setManufacturer] = useState([]);
    const [ageGroup, setAgeGroup] = useState([]);
    
    const [typeSelect, settypeSelect] = useState(null);
    const [manufacturerSelect, setmanufacturerSelect] = useState(null);
    const [ageGroupSelect, setageGroupSelect] = useState(null);
    const editorRef = useRef(null);

    const [textButton, setTextbutton] = useState("Thêm vaccine");

    useEffect(() => {
        const getData = async () => {
            var uls = new URL(document.URL)
            var id = uls.searchParams.get("id");
            if (id != null) {
                setTextbutton("Cập nhật vaccine")
                var response = await getMethod('/api/vaccine/public/find-by-id?id=' + id);
                var result = await response.json();
                setItem(result)
                description = result.description;
                linkbanner = result.image
                settypeSelect(result.vaccineType)
                setmanufacturerSelect(result.manufacturer)
                setageGroupSelect(result.ageGroup)
            }
        };
        getData();

        const getSelect = async () => {
            var response = await getMethod('/api/vaccine-type/find-all');
            var result = await response.json();
            setType(result)
            var response2 = await postMethod('/api/manufacturer/find-all');
            var result2 = await response2.json();
            setManufacturer(result2)
            var response3 = await postMethod('/api/age-group/find-all');
            var result3 = await response3.json();
            setAgeGroup(result3)
        };
        getSelect();

    }, []);

    function handleEditorChange(content, editor) {
        description = content;
    }

    function onchangeFile() {
        const [file] = document.getElementById("fileimage").files
        if (file) {
            document.getElementById("imgpreview").src = URL.createObjectURL(file)
        }
    }

    async function addVaccine(event) {
        event.preventDefault();
        var uls = new URL(document.URL)
        var id = uls.searchParams.get("id");
        
        // ================= XỬ LÝ VALIDATE JAVASCRIPT =================
        const vaccineName = event.target.elements.vaccineName.value.trim();
        const price = event.target.elements.price.value;
        const inventory = event.target.elements.inventory.value;
        const status = event.target.elements.status.value.trim();
        const maxDose = event.target.elements.maxDose.value;
        const minIntervalMonths = event.target.elements.minIntervalMonths.value;

        if (!vaccineName) {
            toast.warning("Vui lòng nhập tên vaccine hợp lệ!");
            return;
        }
        if (!typeSelect) {
            toast.warning("Vui lòng chọn danh mục vaccine!");
            return;
        }
        if (!manufacturerSelect) {
            toast.warning("Vui lòng chọn nhà máy sản xuất!");
            return;
        }
        if (!ageGroupSelect) {
            toast.warning("Vui lòng chọn nhóm tuổi!");
            return;
        }
        if (id == null && !document.getElementById("fileimage").files[0]) {
            toast.warning("Vui lòng tải lên ảnh cho vaccine mới!");
            return;
        }
        if (maxDose && Number(maxDose) <= 0) {
            toast.warning("Số mũi tối đa phải lớn hơn 0!");
            return;
        }
        if (minIntervalMonths && Number(minIntervalMonths) <= 0) {
            toast.warning("Khoảng cách tiêm phải lớn hơn 0!");
            return;
        }
        // ================= KẾT THÚC VALIDATE =================

        var linktam = await uploadSingleFile(document.getElementById('fileimage'))
        if (linktam != null) linkbanner = linktam
        
        var payload = {
            "id": id,
            "name": vaccineName,
            "description": description,
            "image": linkbanner,
            "price": price,
            "inventory": inventory,
            "quantity": inventory,
            "vaccineTypeId": typeSelect.id,
            "manufacturerId": manufacturerSelect.id,
            "ageGroupId": ageGroupSelect.id,
            "status": status,
            "maxDose": maxDose ? parseInt(maxDose) : null,
            "minIntervalMonths": minIntervalMonths ? parseInt(minIntervalMonths) : null,
        }
        
        var res = null;
        if (id == null) {
            res = await postMethodPayload('/api/vaccine/create', payload)
        } else {
            res = await postMethodPayload('/api/vaccine/update', payload)
        }
        
        if (res.status < 300) {
            Swal.fire({
                title: "Thông báo",
                text: "Thành công!",
                preConfirm: () => {
                    window.location.href = 'vaccine'
                }
            });
        } else {
            if (res.status === 417) {
                var result = await res.json();
                toast.warning(result.defaultMessage);
            } else {
                toast.error("Thêm/ sửa thất bại");
            }
        }
    }

    return (
        <>
            <div className='row'>
                <div className='col-sm-4'>
                    <div className='headpageadmin'>
                        <span>{textButton}</span>
                    </div>
                </div>
            </div>
            <form className='row' onSubmit={addVaccine} method='post'>
                <div className='col-sm-5'>
                    <label className="lb-form">Tên vaccine</label>
                    <input defaultValue={item?.name} name='vaccineName' type="text" className="form-control" required /><br />
                    
                    {/* Đổi type thành number và thêm min="0" để chặn nhập chữ/số âm */}
                    <label className="lb-form">Giá tiền (VNĐ)</label>
                    <input defaultValue={item?.price} name='price' type="number" min="0" className="form-control" required /><br />
                    
                    <label className="lb-form">Số lượng nhập kho</label>
                    <input defaultValue={item?.inventory} name='inventory' type="number" min="0" className="form-control" required /><br />
                    
                    <label className="lb-form">Trạng thái</label>
                    <input defaultValue={item?.status} name='status' type="text" className="form-control" required /><br />
                    
                    <label className="lb-form">Ảnh</label>
                    <input onChange={onchangeFile} id='fileimage' type='file' accept="image/*" className="form-control" /><br />
                    <img id='imgpreview' src={item?.image} className='imgtable' alt="Preview" /><br />
                    
                    <label className="lb-form">Số mũi tối đa (để trống nếu không giới hạn)</label>
                    <input defaultValue={item?.maxDose} name='maxDose' type="number" min="1" className="form-control" placeholder="Ví dụ: 2" /><br />
                    
                    <label className="lb-form">Khoảng cách tiêm (tháng - để trống nếu không có)</label>
                    <input defaultValue={item?.minIntervalMonths} name='minIntervalMonths' type="number" min="1" className="form-control" placeholder="Ví dụ: 2" /><br />
                    
                    <label className="lb-forms">Danh mục</label>
                    <Select
                        options={type}
                        value={typeSelect}
                        onChange={settypeSelect}
                        getOptionLabel={(option) => option.typeName}
                        getOptionValue={(option) => option.id}
                        closeMenuOnSelect={true}
                        name='danhMuc'
                        placeholder="Chọn danh mục"
                    />
                    <br />
                    <label className="lb-forms">Nhà máy sản xuất</label>
                    <Select
                        options={manufacturer}
                        value={manufacturerSelect}
                        onChange={setmanufacturerSelect}
                        getOptionLabel={(option) => option.name}
                        getOptionValue={(option) => option.id}
                        closeMenuOnSelect={true}
                        name='manufacturer'
                        placeholder="Chọn nhà máy sản xuất"
                    />
                    <br />
                    <label className="lb-forms">Nhóm tuổi</label>
                    <Select
                        options={ageGroup}
                        value={ageGroupSelect}
                        onChange={setageGroupSelect}
                        getOptionLabel={(option) => option.ageRange}
                        getOptionValue={(option) => option.id}
                        closeMenuOnSelect={true}
                        name='ageGroup'
                        placeholder="Chọn nhóm tuổi"
                    />
                </div>
                <div className='col-sm-7'>
                    <label className="lb-forms">Mô tả vaccine</label>
                    <Editor name='editor' tinymceScriptSrc={'https://cdn.tiny.cloud/1/mcvdwnvee5gbrtksfafzj5cvgml51to5o3u7pfvnjhjtd2v1/tinymce/6/tinymce.min.js'}
                        onInit={(evt, editor) => editorRef.current = editor}
                        initialValue={item == null ? '' : item.description}
                        onEditorChange={handleEditorChange} /><br />
                    <button className='btn btn-primary form-control'>{textButton}</button>
                </div>
            </form>
        </>
    );
}

export default StaffAddVaccine;