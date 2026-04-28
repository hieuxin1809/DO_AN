package com.web.service;

import com.web.entity.Authority;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.web.dto.CustomUserDetails;
import com.web.dto.TokenDto;
import com.web.dto.UserRequest;
import com.web.dto.UserUpdate;
import com.web.entity.CustomerProfile;
import com.web.entity.User;
import com.web.enums.UserType;
import com.web.exception.MessageException;
import com.web.jwt.JwtTokenProvider;
import com.web.repository.AuthorityRepository;
import com.web.repository.CustomerProfileRepository;
import com.web.repository.UserRepository;
import com.web.utils.Contains;
import com.web.utils.MailService;
import com.web.utils.UserUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import java.util.logging.Logger;

import java.sql.Date;
import java.util.*;

@Component
public class UserService {

    private static final Logger logger = Logger.getLogger(UserService.class.getName());
    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuthorityRepository authorityRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private MailService mailService;

    @Autowired
    private UserUtils userUtils;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private CustomerProfileRepository customerProfileRepository;

    public TokenDto login(String email, String password) throws Exception {
        Optional<User> users = userRepository.findByEmail(email);
        if (users.isPresent()) {
            if (users.get().getUserType().equals(UserType.google)) {
                throw new MessageException("Hãy đăng nhập bằng google");
            }
        }
        // check infor user
        System.out.println(email);
        checkUser(users);
        if(passwordEncoder.matches(password, users.get().getPassword())){
//        if (password.equalsIgnoreCase(users.get().getPassword())) {
            CustomUserDetails customUserDetails = new CustomUserDetails(users.get());
            String token = jwtTokenProvider.generateToken(customUserDetails);
            TokenDto tokenDto = new TokenDto();
            tokenDto.setToken(token);
            tokenDto.setUser(users.get());
            return tokenDto;
        } else {
            throw new MessageException("Mật khẩu không chính xác", 400);
        }
    }


    public TokenDto loginWithGoogle(GoogleIdToken.Payload payload) throws Exception {
        User user = new User();
        user.setEmail(payload.getEmail());
//        user.setAvatar(payload.get("picture").toString());
//        user.setFullName(payload.get("name").toString());
        user.setActived(true);
        user.setAuthorities(authorityRepository.findByName(Contains.ROLE_CUSTOMER));
        user.setCreatedDate(new Date(System.currentTimeMillis()));
        user.setUserType(UserType.google);

        Optional<User> users = userRepository.findByEmail(user.getEmail());
        // check infor user
        if (users.isPresent()) {
            if (users.get().getActived() == false) {
                throw new MessageException("Tài khoản đã bị khóa");
            }
            CustomUserDetails customUserDetails = new CustomUserDetails(users.get());
            String token = jwtTokenProvider.generateToken(customUserDetails);
            TokenDto tokenDto = new TokenDto();
            tokenDto.setToken(token);
            tokenDto.setUser(users.get());
            CustomerProfile ex = customerProfileRepository.findByUser(users.get().getId());
            if(ex == null){
                CustomerProfile customerProfile = new CustomerProfile();
                customerProfile.setUser(users.get());
                customerProfileRepository.save(customerProfile);
            }
            return tokenDto;
        } else {
            User u = userRepository.save(user);
            CustomerProfile customerProfile = new CustomerProfile();
            customerProfile.setUser(u);
            customerProfileRepository.save(customerProfile);
            CustomUserDetails customUserDetails = new CustomUserDetails(u);
            String token = jwtTokenProvider.generateToken(customUserDetails);
            TokenDto tokenDto = new TokenDto();
            tokenDto.setToken(token);
            tokenDto.setUser(u);
            return tokenDto;
        }
    }

    public Boolean checkUser(Optional<User> users) {
        if (users.isPresent() == false) {
            throw new MessageException("Không tìm thấy tài khoản", 404);
        } else if (users.get().getActivationKey() != null && users.get().getActived() == false) {
            throw new MessageException("Tài khoản chưa được kích hoạt", 300);
        } else if (users.get().getActived() == false && users.get().getActivationKey() == null) {
            throw new MessageException("Tài khoản đã bị khóa", 500);
        }
        return true;
    }

    public User regisUser(UserRequest userRequest) {
        userRepository.findByEmail(userRequest.getEmail())
                .ifPresent(exist -> {
                    if (exist.getActivationKey() != null) {
                        throw new MessageException("Tài khoản chưa được kích hoạt", 330);
                    }
                    throw new MessageException("Email đã được sử dụng", 400);
                });
        User user = new User();
        user.setUserType(UserType.standard);
//        user.setPassword(passwordEncoder.encode(userRequest.getPassword()));
        user.setPassword(userRequest.getPassword());
        user.setAuthorities(authorityRepository.findByName(Contains.ROLE_CUSTOMER));
        user.setActived(false);
        user.setEmail(userRequest.getEmail());
//        user.setFullName(userRequest.getFullName());
        user.setCreatedDate(new Date(System.currentTimeMillis()));
        user.setActivationKey(userUtils.randomKey());
        User result = userRepository.save(user);
        mailService.sendEmail(user.getEmail(), "Xác nhận tài khoản của bạn", "Cảm ơn bạn đã tin tưởng và xử dụng dịch vụ của chúng tôi:<br>" +
                "Để kích hoạt tài khoản của bạn, hãy nhập mã xác nhận bên dưới để xác thực tài khoản của bạn<br><br>" +
                "<a style=\"background-color: #2f5fad; padding: 10px; color: #fff; font-size: 18px; font-weight: bold;\">" + user.getActivationKey() + "</a>", false, true);
        CustomerProfile customerProfile = new CustomerProfile();
        customerProfile.setUser(result);
        customerProfileRepository.save(customerProfile);
        return result;
    }
    public User registerUser(UserRequest userRequest) {
        // Kiểm tra email đã tồn tại chưa
        userRepository.findByEmail(userRequest.getEmail())
                .ifPresent(exist -> {
                    if (exist.getActivationKey() != null) {
                        throw new MessageException("Tài khoản chưa được kích hoạt", 330);
                    }
                    throw new MessageException("Email đã được sử dụng", 400);
                });

        // Tạo đối tượng User mới
        User user = new User();
        user.setUserType(UserType.standard);
        user.setPassword(passwordEncoder.encode(userRequest.getPassword())); // Mã hóa mật khẩu
        user.setAuthorities(authorityRepository.findByName(Contains.ROLE_CUSTOMER));
        user.setActived(false);
        user.setEmail(userRequest.getEmail());
        user.setCreatedDate(new Date(System.currentTimeMillis()));
        user.setActivationKey(userUtils.randomKey());

        // Lưu người dùng vào cơ sở dữ liệu
        User result = userRepository.save(user);

        // Gửi email kích hoạt tài khoản
        mailService.sendEmail(user.getEmail(), "Xác nhận tài khoản của bạn",
                "Cảm ơn bạn đã tin tưởng và sử dụng dịch vụ của chúng tôi:<br>" +
                        "Để kích hoạt tài khoản của bạn, hãy nhập mã xác nhận bên dưới để xác thực tài khoản của bạn<br><br>" +
                        "<a style=\"background-color: #2f5fad; padding: 10px; color: #fff; font-size: 18px; font-weight: bold;\">" +
                        user.getActivationKey() + "</a>", false, true);

        return result;
    }

    public void activeAccount(String key, String email) {
        logger.info("Bắt đầu kích hoạt tài khoản cho email: " + email);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    logger.severe("Không tìm thấy user với email: " + email);
                    return new MessageException("Email không tồn tại", 404);
                });

        logger.info("User tìm thấy: " + user.getEmail());
        logger.info("Mã kích hoạt từ yêu cầu: " + key + ", Mã kích hoạt trong DB: " + user.getActivationKey());

        if (user.getActived()) {
            logger.warning("User đã được kích hoạt: " + email);
            throw new MessageException("Tài khoản đã được kích hoạt trước đó", 400);
        }
        if (user.getActivationKey() == null || !key.equals(user.getActivationKey())) {
            logger.warning("Key kích hoạt không hợp lệ cho email: " + email);
            throw new MessageException("Mã kích hoạt không hợp lệ", 400);
        }

        user.setActived(true);
        user.setActivationKey(null);
        userRepository.save(user);
        logger.info("Trạng thái tài khoản sau khi lưu: Actived = " + user.getActived() + ", Activation Key = " + user.getActivationKey());
        logger.info("User đã được kích hoạt thành công: " + email);
    }

    public void updateRole(Long userId, Long authorityId) {
        User user = userRepository.findById(userId).get();
        Authority authority = authorityRepository.findById(authorityId).get();
        user.setAuthorities(authority);
        userRepository.save(user);
    }

    public void guiYeuCauQuenMatKhau(String email, String url) {
        Optional<User> user = userRepository.findByEmail(email);
        if (user.isPresent()) {
            if (user.get().getUserType().equals(UserType.google)) {
                throw new MessageException("Tài khoản đăng nhập bằng google, không thể thực hiện chức năng này");
            }
        }
        checkUser(user);
        String random = userUtils.randomKey();
        user.get().setRememberKey(random);
        userRepository.save(user.get());

        mailService.sendEmail(email, "Đặt lại mật khẩu", "Cảm ơn bạn đã tin tưởng và xử dụng dịch vụ của chúng tôi:<br>" +
                "Chúng tôi đã tạo một mật khẩu mới từ yêu cầu của bạn<br>" +
                "Hãy lick vào bên dưới để đặt lại mật khẩu mới của bạn<br><br>" +
                "<a href='" + url + "?email=" + email + "&key=" + random + "' style=\"background-color: #2f5fad; padding: 10px; color: #fff; font-size: 18px; font-weight: bold;\">Đặt lại mật khẩu</a>", false, true);

    }

    public void xacNhanDatLaiMatKhau(String email, String password, String key) {
        Optional<User> user = userRepository.findByEmail(email);
        checkUser(user);
        if (user.get().getRememberKey().equals(key)) {
            user.get().setPassword(passwordEncoder.encode(password));
            userRepository.save(user.get());
        } else {
            throw new MessageException("Mã xác thực không chính xác");
        }
    }

    public void updateInfor(UserUpdate userUpdate) {
        User user = userUtils.getUserWithAuthority();
//        user.setFullName(userUpdate.getFullName());
//        user.setAvatar(userUpdate.getAvatar());
//        user.setAddress(userUpdate.getAddress());
        userRepository.save(user);
    }

    public void changePass(String oldPass, String newPass) {
        User user = userUtils.getUserWithAuthority();
        if (user.getUserType().equals(UserType.google)) {
            throw new MessageException("Xin lỗi, chức năng này không hỗ trợ đăng nhập bằng google");
        }
//        if (passwordEncoder.matches(oldPass, user.getPassword())) {
        if (oldPass.equals(user.getPassword())) {
            user.setPassword(newPass);
            userRepository.save(user);
        }
        else {
            throw new MessageException("Mật khẩu cũ không chính xác", 500);
        }
    }

    public List<User> getUserByRole(String role) {
        if (role == null) {
            return userRepository.findAll();
        }
        return userRepository.getUserByRole(role);
    }

    public List<User> getEmployeesByAuthority(Long authorityId) {
        return userRepository.findEmployeesByAuthority(authorityId);
    }

    public List<String> getRolesByAccountId(Long accountId) {
        Optional<User> userOpt = userRepository.findById(accountId);
        if (userOpt.isPresent()) {
            Authority authority = userOpt.get().getAuthorities();
            return Collections.singletonList(authority.getName()); // Trả về danh sách chứa tên quyền
        }
        return Collections.emptyList(); // Trả về danh sách rỗng nếu không tìm thấy
    }

}
