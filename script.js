const firebaseConfig = {
    apiKey: "AIzaSyBD7C-4YqcnioENEf8XFX8O7QELegdTV4w",
    authDomain: "lop-12a1.firebaseapp.com",
    projectId: "lop-12a1",
    storageBucket: "lop-12a1.appspot.com",
    messagingSenderId: "331825203362",
    appId: "1:331825203362:web:ce006a8e80a0614ff1a46b"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let isAdmin = false;
let lastCommentTime = 0;

function escapeHtml(str) {
    if (!str) return "";
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function safeUrl(url) {
    if (!url) return "#";
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:")) return "#";
    return escapeHtml(url);
}

function maskPhone(phone) {
    if (!phone) return "--";
    if (isAdmin) return escapeHtml(phone);
    return phone.length > 4 ? phone.substring(0, 3) + "******" : "******";
}

function maskGmail(gmail) {
    if (!gmail) return "--";
    if (isAdmin) return escapeHtml(gmail);
    const parts = gmail.split("@");
    if (parts.length !== 2) return "hidden@gmail.com";
    return parts[0].substring(0, 2) + "***@" + parts[1];
}

function toggleAdminModal() {
    const modal = document.getElementById("admin-modal");
    modal.style.display = modal.style.display === "flex" ? "none" : "flex";
}

async function handleAdminLogin() {
    const user = document.getElementById("admin-user").value.trim();
    const pass = document.getElementById("admin-pass").value.trim();
    
    if (!user || !pass) {
        alert("Vui lòng điền đầy đủ thông tin!");
        return;
    }

    const msgBuffer = new TextEncoder().encode(pass);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const passHash = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

    db.collection("class_data").doc("main").get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            if (user === data.adminUser && passHash === data.adminPassHash) {
                isAdmin = true;
                toggleAdminModal();
                document.getElementById("admin-btn").innerHTML = '<fa class="fa-solid fa-check"></fa> Admin ✓';
                document.getElementById("admin-btn").style.background = "#28a745";
                loadData();
                alert("Đăng nhập thành công!");
            } else {
                alert("Sai tài khoản hoặc mật khẩu!");
            }
        }
    }).catch(err => console.error(err));
}

function loadData() {
    db.collection("class_data").doc("main").get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            renderMembers(data.members || []);
            renderComments(data.posts || []);
        }
    });
}

function renderMembers(members) {
    const tbody = document.getElementById("member-list-body");
    tbody.innerHTML = "";
    members.forEach((m, index) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHtml(m.name)}</td>
            <td>${maskPhone(m.phone)}</td>
            <td>${m.link ? `<a href="${safeUrl(m.link)}" target="_blank">Xem</a>` : "--"}</td>
            <td>${maskGmail(m.gmail)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function postComment() {
    const now = Date.now();
    if (now - lastCommentTime < 4000) {
        alert("Vui lòng chờ vài giây trước khi gửi tiếp!");
        return;
    }

    const nameInput = document.getElementById("comment-name");
    const contentInput = document.getElementById("comment-content");
    let name = nameInput.value.trim();
    let content = contentInput.value.trim();

    if (!name || !content) {
        alert("Vui lòng nhập đầy đủ tên và nội dung!");
        return;
    }

    if (name.toLowerCase().includes("admin")) {
        alert("Tên không hợp lệ!");
        return;
    }

    lastCommentTime = now;
    
    db.collection("class_data").doc("main").get().then((doc) => {
        if (doc.exists) {
            let data = doc.data();
            let posts = data.posts || [];
            posts.unshift({
                name: escapeHtml(name),
                content: escapeHtml(content),
                time: new Date().toLocaleString()
            });

            db.collection("class_data").doc("main").update({ posts: posts }).then(() => {
                contentInput.value = "";
                loadData();
            });
        }
    });
}

function renderComments(posts) {
    const container = document.getElementById("comments-container");
    container.innerHTML = "";
    posts.forEach(p => {
        const div = document.createElement("div");
        div.className = "comment-item";
        div.innerHTML = `<strong>${p.name}</strong> <span>(${p.time})</span><p>${p.content}</p>`;
        container.appendChild(div);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    loadData();
});