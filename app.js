

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';


const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// DOM
const form = document.getElementById('admissionForm');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const submitBtn = document.getElementById('submitBtn');
const photoInput = document.getElementById('photo');
const filePreview = document.getElementById('filePreview');

// Small helper to show messages
function showMessage(text, type='success'){
  statusEl.innerHTML = '';
  const p = document.createElement('div');
  p.className = `message ${type}`;
  p.style.padding = '10px';
  p.style.borderRadius = '8px';
  p.style.marginTop = '6px';
  p.style.background = type === 'success' ? '#e6faf0' : '#ffecec';
  p.style.color = type === 'success' ? '#0b6b3a' : '#8b1a1a';
  p.textContent = text;
  statusEl.appendChild(p);
  setTimeout(()=>{ if(statusEl.contains(p)) statusEl.removeChild(p); }, 9000);
}

// Validate form beyond HTML attributes
function validateForm(fd){
  const email = fd.get('email')?.trim();
  const phone = fd.get('phone')?.trim();
  const cnic = fd.get('cnic')?.trim();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if(!emailRegex.test(email)) throw new Error('Please provide a valid email address.');

  const phoneDigits = (phone || '').replace(/\D/g,'');
  if(phoneDigits.length < 10) throw new Error('Please provide a valid phone number with at least 10 digits.');

  if(!/^\d{13}$/.test(cnic)) throw new Error('CNIC/B-Form must be 13 digits without dashes.');

  return true;
}

// Preview image when user selects a file
photoInput.addEventListener('change', () => {
  const f = photoInput.files[0];
  if(!f){ filePreview.textContent = 'No photo'; return; }
  if(f.size > 3 * 1024 * 1024){ showMessage('Photo too large. Max 3 MB.', 'error'); photoInput.value = ''; filePreview.textContent = 'No photo'; return; }

  const img = document.createElement('img');
  img.alt = 'photo';
  img.src = URL.createObjectURL(f);
  img.onload = () => URL.revokeObjectURL(img.src);
  filePreview.innerHTML = '';
  filePreview.appendChild(img);
});

resetBtn.addEventListener('click', () => {
  form.reset();
  filePreview.textContent = 'No photo';
  statusEl.innerHTML = '';
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';
  try{
    const fd = new FormData(form);
    validateForm(fd);

    const applicant = {
      fullName: fd.get('fullName')?.trim(),
      fatherName: fd.get('fatherName')?.trim(),
      email: fd.get('email')?.trim(),
      phone: fd.get('phone')?.trim(),
      cnic: fd.get('cnic')?.trim(),
      program: fd.get('program')?.trim(),
      address: fd.get('address')?.trim(),
      education: fd.get('education')?.trim(),
      experience: fd.get('experience')?.trim() || null,
      photoURL: null,
      createdAt: serverTimestamp()
    };

    const photoFile = photoInput.files[0];
    if(photoFile){
      // upload to storage
      const dest = `applicants/${Date.now()}_${photoFile.name}`;
      const sRef = storageRef(storage, dest);
      await uploadBytes(sRef, photoFile);
      const url = await getDownloadURL(sRef);
      applicant.photoURL = url;
    }

    // Save to Firestore
    const col = collection(db, 'applications');
    await addDoc(col, applicant);

    showMessage('Application submitted successfully. Thank you!', 'success');
    form.reset();
    filePreview.textContent = 'No photo';
  }catch(err){
    console.error(err);
    showMessage(err.message || 'An error occurred during submission.', 'error');
  }finally{
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Application';
  }
});


document.querySelectorAll('input[type=text], input[type=email], textarea').forEach(i => {
  i.addEventListener('blur', () => i.value = i.value.trim());
});
