// firebase-config.js – SIÊU NHẸ
const firebaseConfig = {
  apiKey: "AIzaSyCR4yV_uWs_fwm9D5zCh5Lar5Aok7zEcMc",
  authDomain: "airmonitoring-project.firebaseapp.com",
  databaseURL: "https://airmonitoring-project-default-rtdb.firebaseio.com",
  projectId: "airmonitoring-project",
  storageBucket: "airmonitoring-project.firebasestorage.app",
  messagingSenderId: "981548858798",
  appId: "1:981548858798:web:ad66bdd642f460acac9c3f"
};

firebase.initializeApp(firebaseConfig);
window.db = firebase.database();