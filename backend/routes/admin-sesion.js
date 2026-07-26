const express = require("express");
const router = express.Router();


// Login admin
router.post("/login", (req, res) => {

    const { usuario, password } = req.body;

    // Por ahora usamos credenciales simples
    // Después podemos pasarlo a base de datos

    if (
        usuario === process.env.ADMIN_USER &&
        password === process.env.ADMIN_PASSWORD
    ) {

        res.cookie(
            "admin_token",
            "admin-auth-ok",
            {
                httpOnly: true,
                sameSite: "lax"
            }
        );

        return res.json({
            ok: true,
            mensaje: "Login correcto"
        });

    }

    return res.status(401).json({
        ok:false,
        mensaje:"Usuario o contraseña incorrectos"
    });

});


// Ver sesión actual
router.get("/sesion", (req,res)=>{

    const token = req.cookies.admin_token;

    if(token === "admin-auth-ok"){

        return res.json({
            logueado:true
        });

    }

    res.json({
        logueado:false
    });

});

// Logout
router.post("/logout",(req,res)=>{

    res.clearCookie("admin_token", {
        httpOnly: true,
        sameSite: "lax"
    });

    res.json({
        ok:true
    });

});

module.exports = router;