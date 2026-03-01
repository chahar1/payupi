const crypto = require('crypto');
const fetch = require('node-fetch');

class PhonePe {
    randomString(length) {
        let key = "";
        const keys = "0123456789abcdef"; // Match PHP order
        for (let i = 0; i < length; i++) {
            key += keys.charAt(Math.floor(Math.random() * keys.length));
        }
        return key;
    }

    randomNumber(length) {
        let str = "";
        for (let i = 0; i < length; i++) {
            str += Math.floor(Math.random() * 10).toString();
        }
        return str;
    }

    checksum(data) {
        const advid = `${this.randomString(8)}-${this.randomString(4)}-${this.randomString(4)}-${this.randomString(4)}-${this.randomString(12)}`;

        // keygen implementation from PHP
        const ket = "1lgVNAAtWyq06UfYjM/UBnJ5ZSA=";
        let keytry = ket[0] + advid[0] + ket[1] + advid[1] + ket[2] + advid[2] + ket[3] + advid[3] + ket[4] + advid[4] + ket[5] + advid[5] + ket[6] + advid[6] + ket[7] + advid[7] + ket[8] + advid[8] + ket[9] + advid[9] + ket[10] + advid[10] + ket[11] + advid[11] + ket[12] + advid[12] + ket[13] + advid[13] + ket[14] + advid[14] + ket[15] + advid[15];

        const aeskey = crypto.createHash('sha1').update(keytry).digest();
        const datahash = crypto.createHash('sha256').update(data).digest('base64');

        const milliseconds = Date.now();
        const payload = `${milliseconds}###${datahash}`;

        const cipher = crypto.createCipheriv('aes-128-ecb', aeskey, null);
        cipher.setAutoPadding(true);
        let encrypted = cipher.update(payload, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        // fnalsing implementation from PHP
        const aa = advid.substring(0, 4);
        const ab = advid.substring(4, 8);
        const ac = advid.substring(8, 12);
        const ad = advid.substring(12, 16);

        const aa1 = encrypted.substring(0, 4);
        const a1 = encrypted.substring(4, 8);
        const a2 = encrypted.substring(8, 12);
        const a3 = encrypted.substring(12);

        const finalSignature = Buffer.from(`${aa}${aa1}${ab}${a1}${ac}${a2}${ad}${a3}`).toString('base64');
        return finalSignature;
    }

    async sendOtp(number) {
        const finger1 = crypto.createHash('sha256').update(this.randomNumber(19)).digest('hex').substring(0, 32);
        const finger2 = crypto.createHash('sha256').update(this.randomNumber(13)).digest('hex').substring(0, 32);
        const finger3 = this.randomString(64);
        const fingerprint = `${finger2}.${finger1}.Xiaomi.${finger3}`;
        const deviceFingerprint = `${this.randomString(16)}c2RtNjM2-cWNvbQ-`;

        const path = "/apis/merchant-insights/v3/auth/sendOtp";
        const url = `https://business-api.phonepe.com${path}`;
        const data = JSON.stringify({
            type: "OTP",
            phoneNumber: number,
            deviceFingerprint: deviceFingerprint
        });

        const checksum = this.checksum(`${path}${data}`);
        const ip = `${Math.floor(Math.random() * 240) + 1}.${Math.floor(Math.random() * 240) + 1}.${Math.floor(Math.random() * 240) + 1}.${Math.floor(Math.random() * 240) + 1}`;

        const headers = {
            "Host": "business-api.phonepe.com",
            "x-app-id": "bd309814ea4c45078b9b25bd52a576de",
            "x-merchant-id": "PHONEPEBUSINESS",
            "x-source-type": "PB_APP",
            "x-source-platform": "ANDROID",
            "x-source-locale": "en",
            "x-source-version": "1290004046",
            "fingerprint": fingerprint,
            "x-device-fingerprint": deviceFingerprint,
            "x-app-version": "0.4.46",
            "x-request-sdk-checksum": checksum,
            "content-type": "application/json; charset=utf-8",
            "user-agent": "okhttp/3.12.13",
            "X-Forwarded-For": ip
        };

        const response = await fetch(url, { method: 'POST', body: data, headers });
        const json = await response.json();

        if (json.expiry == "600") {
            const device = Buffer.from(`${fingerprint}||${deviceFingerprint}||${ip}`).toString('hex');
            return { status: "SUCCESS", token: json.token, device };
        }
        return { status: "FAILED" };
    }

    getFarm() {
        const mb = this.randomString(8);
        const mc = this.randomString(4);
        const md = this.randomString(4);
        const mf = this.randomString(12);
        const mh = this.randomString(4);
        const mg = this.randomString(4);
        return `${mb}-${mc}-${md}-${mh}-${mf}`; // Match PHP format
    }

    async verifyOtp(number, otp, token, device) {
        const deviceData = Buffer.from(device, 'hex').toString('utf8');
        const [fingerprint, xdevicefingerprint, ip] = deviceData.split('||');

        const path = "/apis/merchant-insights/v3/auth/login";
        const url = `https://business-api.phonepe.com${path}`;

        const fact2 = xdevicefingerprint.substring(0, 16);
        const fingerParts = fingerprint.split('.');
        const g1 = fingerParts[3];
        const osid = fingerParts[0];
        const xdhp = fingerParts[1];
        const milliseconds = Date.now();

        const data = JSON.stringify({
            type: "OTP",
            clientContext: JSON.stringify({
                device: {
                    identifier: {
                        macAddress: "00:00:00:00:00:00",
                        fact1: "",
                        fact2: fact2,
                        fact3: "NA",
                        gd: { g1: g1 },
                        omid: "Xiaomi",
                        osid: osid,
                        pid: "NA",
                        xdhp: xdhp
                    },
                    location: { latitude: 0, longitude: 0, confidence: 0, locs: -1 },
                    network: { ipv4: ip, ipv6: "NA", bssid: "NA", ssid: "<unknown ssid>", essid: "NA", ipm: 1 },
                    cellularNetwork: { dualSim: false, towers: [] },
                    security: { as: false, emulated: false, rooted: false, safetyNetScore: 0.5, dsec: 1, emuChk: false, rck: { a: false, b: "" }, macct: {} },
                    software: { os: { name: "Android", version: "30", manu: "Xiaomi", model: "Xiaomi", buildTime: milliseconds.toString() } },
                    call: { cs: 0, lcs: "0,", vcs: 0 },
                    ui: { doa: 0, doaN: [] }
                }
            }),
            deviceFingerprint: xdevicefingerprint,
            otp: otp,
            token: token,
            phoneNumber: number
        });

        const checksum = this.checksum(`${path}${data}`);
        const headers = {
            "Host": "business-api.phonepe.com",
            "x-app-id": "bd309814ea4c45078b9b25bd52a576de",
            "x-merchant-id": "PHONEPEBUSINESS",
            "x-source-type": "PB_APP",
            "x-source-platform": "ANDROID",
            "x-source-locale": "en",
            "x-source-version": "1290004046",
            "fingerprint": fingerprint,
            "x-device-fingerprint": xdevicefingerprint,
            "x-app-version": "0.4.46",
            "x-request-sdk-checksum": checksum,
            "content-type": "application/json; charset=utf-8",
            "user-agent": "okhttp/3.12.13",
            "X-Forwarded-For": ip
        };

        const response = await fetch(url, { method: 'POST', body: data, headers });
        const json = await response.json();

        if (json.token) {
            const loginToken = json.token;
            const refreshToken = json.refreshToken;

            // Refresh step
            const refreshPath = "/apis/merchant-insights/v1/auth/refresh";
            const refreshUrl = `https://business-api.phonepe.com${refreshPath}`;
            const refreshData = "{}";
            const refreshChecksum = this.checksum(`${refreshPath}${refreshData}`);
            const farm = this.getFarm();

            const refreshHeaders = {
                ...headers,
                "x-refresh-token": refreshToken,
                "x-auth-token": loginToken,
                "x-farm-request-id": farm,
                "x-request-sdk-checksum": refreshChecksum
            };

            const refreshRes = await fetch(refreshUrl, { method: 'POST', body: refreshData, headers: refreshHeaders });
            const refreshJson = await refreshRes.json();

            if (refreshJson.token) {
                return {
                    status: "SUCCESS",
                    name: json.name,
                    token: refreshJson.token,
                    refreshToken: refreshJson.refreshToken,
                    groupId: json.groupId,
                    groupValue: json.groupValue,
                    expiresAt: refreshJson.expiresAt
                };
            }
        }
        return { status: "FAILED" };
    }

    async fetchTrx(token, refresh, device, groupValue) {
        const deviceData = Buffer.from(device, 'hex').toString('utf8');
        const [fingerprint, xdevicefingerprint, ip] = deviceData.split('||');
        const milliseconds = Date.now();
        const farm = this.getFarm();

        const path = "/apis/merchant-insights/v3/transactions/list";
        const url = `https://business-api.phonepe.com${path}`;
        const data = JSON.stringify({
            transactionType: "FORWARD",
            filters: {
                status: ["COMPLETED"],
                merchantIds: [groupValue],
                storeIds: []
            },
            from: 1672252200000,
            to: milliseconds,
            offset: 0,
            size: 3
        });

        const checksum = this.checksum(`${path}${data}`);
        const headers = {
            "Host": "business-api.phonepe.com",
            "authorization": `Bearer ${token}`,
            "x-farm-request-id": farm,
            "x-app-id": "bd309814ea4c45078b9b25bd52a576de",
            "x-merchant-id": "PHONEPEBUSINESS",
            "x-source-type": "PB_APP",
            "x-source-platform": "ANDROID",
            "x-source-locale": "en",
            "x-source-version": "1290004046",
            "fingerprint": fingerprint,
            "x-device-fingerprint": xdevicefingerprint,
            "x-app-version": "0.4.46",
            "x-request-sdk-checksum": checksum,
            "content-type": "application/json; charset=utf-8",
            "user-agent": "okhttp/3.12.13",
            "X-Forwarded-For": ip
        };

        const response = await fetch(url, { method: 'POST', body: data, headers });
        const json = await response.json();
        return json.data ? json.data.results : [];
    }

    async updateSession(token, refresh, device) {
        const deviceData = Buffer.from(device, 'hex').toString('utf8');
        const [fingerprint, xdevicefingerprint, ip] = deviceData.split('||');
        const farm = this.getFarm();

        const path = "/apis/merchant-insights/v1/auth/refresh";
        const url = `https://business-api.phonepe.com${path}`;
        const data = "{}";
        const checksum = this.checksum(`${path}${data}`);

        const headers = {
            "Host": "business-api.phonepe.com",
            "x-refresh-token": refresh,
            "x-auth-token": token,
            "x-farm-request-id": farm,
            "x-app-id": "bd309814ea4c45078b9b25bd52a576de",
            "x-merchant-id": "PHONEPEBUSINESS",
            "x-source-type": "PB_APP",
            "x-source-platform": "ANDROID",
            "x-source-locale": "en",
            "x-source-version": "1290004046",
            "fingerprint": fingerprint,
            "x-device-fingerprint": xdevicefingerprint,
            "x-app-version": "0.4.46",
            "x-request-sdk-checksum": checksum,
            "content-type": "application/json; charset=utf-8",
            "user-agent": "okhttp/3.12.13",
            "X-Forwarded-For": ip
        };

        const response = await fetch(url, { method: 'POST', body: data, headers });
        const json = await response.json();

        if (json.token) {
            return {
                status: "SUCCESS",
                token: json.token,
                refresh: json.refreshToken
            };
        }
        return { status: "FAILED" };
    }
}

module.exports = new PhonePe();
