import { ToastContainer } from 'react-toastify';
import { Routes, Route, BrowserRouter as Router } from 'react-router-dom';
import DefaultLayout from './layout/customer/defaultLayout/defaultLayout';
import { publicRoutes, adminRoutes, customerRoutes, staffRoutes, doctorRoutes } from './router/index';
import AdminLayout from './layout/admin/Layout';
import RoleGuard from './components/RoleGuard';
import "./App.css";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public routes — không cần đăng nhập */}
          {publicRoutes.map((route, index) => {
            const Layout = route.layout !== undefined ? route.layout : DefaultLayout;
            const Page = route.component;
            return <Route key={`p-${index}`} path={route.path} element={
              Layout ? <Layout><Page /></Layout> : <Page />
            } />;
          })}

          {/* Customer routes — cần role Customer */}
          {customerRoutes.map((route, index) => {
            const Layout = route.layout || DefaultLayout;
            const Page = route.component;
            return <Route key={`c-${index}`} path={route.path} element={
              <RoleGuard allow={['Customer']}>
                <Layout><Page /></Layout>
              </RoleGuard>
            } />;
          })}

          {/* Admin routes — cần role Admin */}
          {adminRoutes.map((route, index) => {
            const Layout = route.layout || AdminLayout;
            const Page = route.component;
            return <Route key={`a-${index}`} path={route.path} element={
              <RoleGuard allow={['Admin']}>
                <Layout><Page /></Layout>
              </RoleGuard>
            } />;
          })}

          {/* Doctor routes — cần role Doctor */}
          {doctorRoutes.map((route, index) => {
            const Layout = route.layout;
            const Page = route.component;
            return <Route key={`d-${index}`} path={route.path} element={
              <RoleGuard allow={['Doctor']}>
                <Layout><Page /></Layout>
              </RoleGuard>
            } />;
          })}

          {/* Staff routes (legacy) — cho phép Admin + Doctor truy cập tạm */}
          {staffRoutes.map((route, index) => {
            const Layout = route.layout;
            const Page = route.component;
            return <Route key={`s-${index}`} path={route.path} element={
              <RoleGuard allow={['Admin', 'Doctor']}>
                <Layout><Page /></Layout>
              </RoleGuard>
            } />;
          })}
        </Routes>
      </div>
      <ToastContainer />
    </Router>
  );
}

export default App;
