/**
 * Doctor chat page — reuse staff chat component.
 * Logic chat (subscribe WebSocket, hiển thị user list) giống y hệt staff cũ,
 * chỉ khác: receiver pool ở backend giờ chỉ là Doctor.
 */
import StaffChat from '../staff/chat';

export default StaffChat;
