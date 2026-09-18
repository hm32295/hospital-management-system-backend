const express = require("express");

const protect = require("../middlewares/authMiddleware");

const {createOperation,getAllOperations,getSingleOperation,updateOperation,cancelOperation,completeOperation,
} = require("../controllers/operationController");

const operationRouter =express.Router();

operationRouter.post("/",protect,createOperation)
        .get("/",protect,getAllOperations)
        .patch("/:id/complete",protect,completeOperation)
        .get("/:id",protect,getSingleOperation)
        .put("/:id",protect,updateOperation)
        .delete("/:id",protect,cancelOperation);

module.exports =operationRouter;