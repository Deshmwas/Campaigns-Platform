const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class ApiClient {
    constructor() {
        this.baseUrl = API_URL;
    }

    ensureAbsoluteUrl(path) {
        if (!path) return null;
        return path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    }

    getToken() {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('token');
        }
        return null;
    }

    setToken(token) {
        if (typeof window !== 'undefined') {
            localStorage.setItem('token', token);
        }
    }

    removeToken() {
        if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
        }
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const token = this.getToken();

        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers,
            },
        };

        if (options.body && typeof options.body !== 'string') {
            config.body = JSON.stringify(options.body);
        }

        const response = await fetch(url, config);

        if (response.status === 204) {
            return null;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    }

    // Auth
    async register(userData) {
        const data = await this.request('/api/auth/register', {
            method: 'POST',
            body: userData,
        });
        this.setToken(data.token);
        return data;
    }

    async login(credentials) {
        const data = await this.request('/api/auth/login', {
            method: 'POST',
            body: credentials,
        });
        this.setToken(data.token);
        return data;
    }

    async getMe() {
        return this.request('/api/auth/me');
    }

    logout() {
        this.removeToken();
    }

    // Dashboard
    async getDashboard() {
        return this.request('/api/dashboard');
    }

    // Contacts
    async getContacts(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/api/contacts?${query}`);
    }

    async createContact(contactData) {
        return this.request('/api/contacts', {
            method: 'POST',
            body: contactData,
        });
    }

    async updateContact(id, contactData) {
        return this.request(`/api/contacts/${id}`, {
            method: 'PUT',
            body: contactData,
        });
    }

    async deleteContact(id) {
        return this.request(`/api/contacts/${id}`, {
            method: 'DELETE',
        });
    }

    async importContacts(csvData, listId) {
        return this.request('/api/contacts/import', {
            method: 'POST',
            body: { csvData, listId },
        });
    }

    // Lists
    async getLists() {
        return this.request('/api/lists');
    }

    async createList(listData) {
        return this.request('/api/lists', {
            method: 'POST',
            body: listData,
        });
    }

    async updateList(id, listData) {
        return this.request(`/api/lists/${id}`, {
            method: 'PUT',
            body: listData,
        });
    }

    async deleteList(id) {
        return this.request(`/api/lists/${id}`, {
            method: 'DELETE',
        });
    }

    async addContactsToList(listId, contactIds) {
        return this.request(`/api/lists/${listId}/contacts`, {
            method: 'POST',
            body: { contactIds },
        });
    }

    async removeContactsFromList(listId, contactIds) {
        return this.request(`/api/lists/${listId}/contacts`, {
            method: 'DELETE',
            body: { contactIds },
        });
    }

    // Analytics
    async getCampaignAnalytics(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/api/dashboard/analytics?${query}`);
    }

    // Campaigns
    async getCampaigns(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/api/campaigns?${query}`);
    }

    async getCampaign(id) {
        return this.request(`/api/campaigns/${id}`);
    }

    async createCampaign(campaignData) {
        return this.request('/api/campaigns', {
            method: 'POST',
            body: campaignData,
        });
    }

    async updateCampaign(id, campaignData) {
        return this.request(`/api/campaigns/${id}`, {
            method: 'PUT',
            body: campaignData,
        });
    }

    async sendCampaign(id) {
        return this.request(`/api/campaigns/${id}/send`, {
            method: 'POST',
        });
    }

    async deleteCampaign(id) {
        return this.request(`/api/campaigns/${id}`, {
            method: 'DELETE',
        });
    }

    // Templates
    async getEmailTemplates() {
        return this.request('/api/templates/email');
    }

    async getEmailTemplate(id) {
        return this.request(`/api/templates/email/${id}`);
    }

    async createEmailTemplate(templateData) {
        return this.request('/api/templates/email', {
            method: 'POST',
            body: templateData,
        });
    }

    async updateEmailTemplate(id, templateData) {
        return this.request(`/api/templates/email/${id}`, {
            method: 'PUT',
            body: templateData,
        });
    }

    async deleteEmailTemplate(id) {
        return this.request(`/api/templates/email/${id}`, {
            method: 'DELETE',
        });
    }

    async duplicateEmailTemplate(id) {
        return this.request(`/api/templates/email/${id}/duplicate`, {
            method: 'POST',
        });
    }

    async uploadTemplateImage(file) {
        const formData = new FormData();
        formData.append('image', file);
        const token = this.getToken();
        const response = await fetch(`${this.baseUrl}/api/templates/email/upload-image`, {
            method: 'POST',
            headers: {
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Upload failed');
        // If server returns relative path, prefix with API base URL so images load from API host
        const url = this.ensureAbsoluteUrl(data.url || '');
        return { ...data, url };
    }

    async getSmsTemplates() {
        return this.request('/api/templates/sms');
    }

    async getSmsTemplate(id) {
        return this.request(`/api/templates/sms/${id}`);
    }

    async createSmsTemplate(templateData) {
        return this.request('/api/templates/sms', {
            method: 'POST',
            body: templateData,
        });
    }

    async updateSmsTemplate(id, templateData) {
        return this.request(`/api/templates/sms/${id}`, {
            method: 'PUT',
            body: templateData,
        });
    }

    async deleteSmsTemplate(id) {
        return this.request(`/api/templates/sms/${id}`, {
            method: 'DELETE',
        });
    }

    // Sender Emails
    async getSenders() {
        return this.request('/api/senders');
    }

    async createSender(data) {
        return this.request('/api/senders', { method: 'POST', body: data });
    }

    async updateSender(id, data) {
        return this.request(`/api/senders/${id}`, { method: 'PUT', body: data });
    }

    async deleteSender(id) {
        return this.request(`/api/senders/${id}`, { method: 'DELETE' });
    }

    async testSender(id) {
        return this.request(`/api/senders/${id}/test`, { method: 'POST' });
    }

    async sendTestEmail(id, testEmail) {
        return this.request(`/api/senders/${id}/send-test`, { method: 'POST', body: { testEmail } });
    }

    // Password Reset
    async forgotPassword(email) {
        return this.request('/api/auth/forgot-password', { method: 'POST', body: { email } });
    }

    async resetPassword(email, otp, newPassword) {
        return this.request('/api/auth/reset-password', { method: 'POST', body: { email, otp, newPassword } });
    }

    async changePassword(currentPassword, newPassword) {
        return this.request('/api/auth/change-password', {
            method: 'POST',
            body: { currentPassword, newPassword },
        });
    }

    // Import contacts (FormData upload)
    async importContactsCSV(formData) {
        const url = `${this.baseUrl}/api/contacts/import`;
        const token = this.getToken();
        const response = await fetch(url, {
            method: 'POST',
            headers: { ...(token && { Authorization: `Bearer ${token}` }) },
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Import failed');
        return data;
    }

    // User Management
    async getUsers() {
        return this.request('/api/users');
    }

    async createUser(userData) {
        return this.request('/api/users', {
            method: 'POST',
            body: userData,
        });
    }

    async updateUser(id, userData) {
        return this.request(`/api/users/${id}`, {
            method: 'PUT',
            body: userData,
        });
    }

    async deleteUser(id) {
        return this.request(`/api/users/${id}`, {
            method: 'DELETE',
        });
    }

    // Branding & Organization
    async getOrgSettings() {
        return this.request('/api/organization/settings');
    }

    async getBranding(companyId) {
        const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
        return this.request(`/api/organization/branding${query}`, { method: 'GET' });
    }

    async updateOrgSettings(settings) {
        return this.request('/api/organization/settings', {
            method: 'PUT',
            body: settings,
        });
    }

    async uploadLogo(file) {
        const formData = new FormData();
        formData.append('logo', file);
        const token = this.getToken();
        const response = await fetch(`${this.baseUrl}/api/organization/upload-logo`, {
            method: 'POST',
            headers: {
                ...(token && { Authorization: `Bearer ${token}` }),
            },
            body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Upload failed');
        return { ...data, logoUrl: this.ensureAbsoluteUrl(data.logoUrl) };
    }

    ensureAbsoluteUrl(url) {
        if (!url) return null;
        if (url.startsWith('http')) return url;
        const base = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
        const path = url.startsWith('/') ? url : `/${url}`;
        return `${base}${path}`;
    }

    async updateUserPassword(userId, password) {
        return this.request(`/api/users/${userId}`, {
            method: 'PUT',
            body: { password }
        });
    }
}

export default new ApiClient();
