import layoutAdmin from "../layout/admin/Layout";
import layoutLogin from "../layout/customer/loginlayout/login";
import layoutStaff from "../layout/staff/Layout";
import layoutDoctor from "../layout/doctor/Layout";

//admin
import homeAdmin from "../pages/admin/index";
import userAdmin from "../pages/admin/user";
import lichTiemChungAdmin from "../pages/admin/lichtiemchung";
import addLichTiemChungAdmin from "../pages/admin/addlichtiemchung";
import AdminDanhMuc from "../pages/admin/danhmuc";
import CenterAdmin from "../pages/admin/center";
import AddCenterAdmin from "../pages/admin/addcenter";
import AdminCertificates from "../pages/admin/certificates";
import AdminReminders from "../pages/admin/reminders";

//doctor (new)
import DoctorDashboard   from "../pages/doctor/dashboard";
import DoctorTodayQueue  from "../pages/doctor/today-queue";
import DoctorMyPatients  from "../pages/doctor/my-patients";
import DoctorChat        from "../pages/doctor/chat";
import DoctorReports     from "../pages/doctor/reports";
import DoctorProfile     from "../pages/doctor/profile";

//public
import login from "../pages/public/login";
import register from '../pages/public/register';
import signin from '../pages/public/signin';
import khachHangAdmin from "../pages/admin/khachhang";
import employeeAdmin from "../pages/admin/employee";
import AdminPhanHoi from "../pages/admin/phanHoi";
import index from "../pages/public/index";
import TraCuuLichTiem from "../pages/public/tracuulichtiem";
import LichTiemDaQua from "../pages/public/lichtiemdaqua";
import TimKiemVacxin from "../pages/public/timkiemvaccine";
import ActivateAccount from '../pages/public/ActivateAccount';
import QuenMatKhau from "../pages/public/quenmatkhau";
import DatLaiMatKhau from "../pages/public/datlaimatkhau";
import VaccineDanhMuc from "../pages/public/vaccinedanhmuc";
import ThongTinVaccine from "../pages/public/thongtinvaccine";
import VerifyCert from "../pages/public/verifycert";

//customer
import dangkytiemchung from "../pages/customer/dangkytiemchung";
import taikhoan from "../pages/customer/taikhoan";
import thongbao from "../pages/customer/thongbao";
import XacNhanDangky from "../pages/customer/xacnhandangky";
import ThanhCong from "../pages/customer/thanhcong";

//staff
import StaffChat from "../pages/staff/chat";
import Vaccine from "../pages/staff/vaccine/vaccine";
import VaccineInventory from "../pages/staff/vaccineInventory/VaccineInventory";
import CustomerSchedule from "../pages/staff/customerSchedule/CustomerSchedule";
import CustomerScheduleView from "../pages/staff/customerSchedule";
import {CustomerScheduleViewDetail} from "../pages/staff/customerSchedule/modal/CustomerScheduleViewDetail";
import lichTiemChungStaff from "../pages/staff/lichtiemchung";
import addLichTiemChungStaff from "../pages/staff/addlichtiemchung";
import StaffAddVaccine from "../pages/staff/vaccine/addvaccine";

const publicRoutes = [
    {path: "/", component: index},
    { path: "/tim-kiem-vaccine", component: TimKiemVacxin },
    {path: "/index", component: index},
    {path: "/login", component: login, layout: layoutLogin},
    { path: "/activate-account", component: ActivateAccount },
    {path: "/register", component: register },
    {path: "/signin", component: signin },
    {path: "/tra-cuu-lich-tiem", component: TraCuuLichTiem},
    {path: "/lich-tiem-da-qua", component: LichTiemDaQua},
    { path: "/quenmatkhau", component: QuenMatKhau },
    { path: "/datlaimatkhau", component: DatLaiMatKhau },
    {path: "/vaccine-danhmuc", component: VaccineDanhMuc},
    {path: "/thong-tin-vaccine", component: ThongTinVaccine},
    {path: "/verify/:serial", component: VerifyCert, layout: null},
];

const customerRoutes = [
    {path: "/dang-ky-tiem-chung", component: dangkytiemchung},
    {path: "/tai-khoan", component: taikhoan},
    {path: "/thong-bao", component: thongbao},
    {path: "/xac-nhan-dang-ky", component: XacNhanDangky},
    {path: "/thanh-cong", component: ThanhCong},
];

const adminRoutes = [
    {path: "/admin/index", component: homeAdmin, layout: layoutAdmin},
    {path: "/admin/user", component: userAdmin, layout: layoutAdmin},
    { path: "/admin/danhmuc", component: AdminDanhMuc, layout: layoutAdmin },
    { path: "/admin/center", component: CenterAdmin, layout: layoutAdmin },
    { path: "/admin/add-center", component: AddCenterAdmin, layout: layoutAdmin },
    {
        path: "/admin/lich-tiem-chung",
        component: lichTiemChungAdmin,
        layout: layoutAdmin,
    },
    {
        path: "/admin/add-lich-tiem-chung",
        component: addLichTiemChungAdmin,
        layout: layoutAdmin,
    },
    {
        path: "/admin/khach-hang",
        component: khachHangAdmin,
        layout: layoutAdmin,
    },
    {
        path: "/admin/nhan-vien",
        component: employeeAdmin,
        layout: layoutAdmin,
    },
    {
        path: "/admin/phan-hoi",
        component: AdminPhanHoi,
        layout: layoutAdmin,
    },
    { path: "/admin/certificates", component: AdminCertificates, layout: layoutAdmin },
    { path: "/admin/reminders",    component: AdminReminders,    layout: layoutAdmin },
    /* Alias staff pages → admin (cùng component, đổi layout) */
    { path: "/admin/vaccines",      component: Vaccine,                  layout: layoutAdmin },
    { path: "/admin/add-vaccine",   component: StaffAddVaccine,          layout: layoutAdmin },
    { path: "/admin/inventory",     component: VaccineInventory,         layout: layoutAdmin },
    { path: "/admin/registrations", component: CustomerSchedule,         layout: layoutAdmin },
    { path: "/admin/campaigns",     component: CustomerScheduleView,     layout: layoutAdmin },
    { path: "/admin/campaign-detail", component: CustomerScheduleViewDetail, layout: layoutAdmin },
];

const staffRoutes = [
    {path: "/staff/chat", component: StaffChat, layout: layoutStaff},
    {path: "/staff/vaccine", component: Vaccine, layout: layoutStaff},
    {path: "/staff/vaccine-inventory", component: VaccineInventory, layout: layoutStaff},
    {path: "/staff/customer-schedule", component: CustomerSchedule, layout: layoutStaff},
    {path: "/staff/customer-schedule-1", component: CustomerScheduleView, layout: layoutStaff},
    {path: "/staff/customer-schedule-1-detail", component: CustomerScheduleViewDetail, layout: layoutStaff},
    {path: "/staff/lich-tiem-chung", component: lichTiemChungStaff, layout: layoutStaff},
    {path: "/staff/add-lich-tiem-chung", component: addLichTiemChungStaff, layout: layoutStaff},
    {path: "/staff/add-vaccine", component: StaffAddVaccine, layout: layoutStaff},
];


const doctorRoutes = [
    { path: "/doctor/dashboard",    component: DoctorDashboard,  layout: layoutDoctor },
    { path: "/doctor/today-queue",  component: DoctorTodayQueue, layout: layoutDoctor },
    { path: "/doctor/my-patients",  component: DoctorMyPatients, layout: layoutDoctor },
    { path: "/doctor/chat",         component: DoctorChat,       layout: layoutDoctor },
    { path: "/doctor/reports",      component: DoctorReports,    layout: layoutDoctor },
    { path: "/doctor/profile",      component: DoctorProfile,    layout: layoutDoctor },
];

export {publicRoutes, adminRoutes, customerRoutes, staffRoutes, doctorRoutes};