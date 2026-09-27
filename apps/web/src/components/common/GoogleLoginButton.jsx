import {GoogleLogin} from '@react-oauth/google';
import {useTheme} from '../../context/ThemeContext';

export default function GoogleLoginButton({onCredentialReceived, disabled = false}) {
    const {isDark} = useTheme();

    return (
        <div className={`flex justify-center w-full ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <GoogleLogin
                onSuccess={(credentialResponse) => {
                    if (credentialResponse.credential) {
                        onCredentialReceived(credentialResponse.credential);
                    }
                }}
                onError={() => {
                    console.error('Google Sign-In Failed');
                }}
                theme={isDark ? 'outline' : 'filled_blue'}
                size="large"
                shape="rectangular"
                logo_alignment="left"
                width="200"
            />
        </div>
    );
}