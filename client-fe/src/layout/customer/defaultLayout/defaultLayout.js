import { useEffect } from "react";
import Headers from "../header/header";
import Footer from "../footer/footer";
import ChatFrame from "../../../pages/customer/chat";
import AIChatbot from "./AIChatbot";

function DefaultLayout({ children }) {
    useEffect(() => {
        // Reserved for future Custom AI Chatbot integration
    }, []);

    return (
        <div>
            <Headers />
            <div className="main-content-web">
                {children}
            </div>
            <Footer />
            <ChatFrame />
            <AIChatbot />
        </div>
    );
}

export default DefaultLayout;