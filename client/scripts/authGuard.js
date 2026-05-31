const AUTH_STORAGE_KEY = 'reprogrammed.auth';

const getAuthData = () => {
    try {
        return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY)) || null;
    } catch (error) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
    }
};

if (!getAuthData()?.accessToken) {
    alert('Faça login para jogar.');
    window.location.replace('../index.html');
}
