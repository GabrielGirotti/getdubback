import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config(); // Esto carga las variables de .env

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI;

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Conectado a MongoDB");

    // Esquemas existentes
    const dailyRecordSchema = new mongoose.Schema({
      date: { type: Date, required: true },
      ingreso: { type: Number, required: true },
      gasto: { type: Number, required: true },
      balance: { type: Number, required: true },
      nombreIngreso: { type: String }, // opcional
      nombreGasto: { type: String }, // opcional
    });
    const DailyRecord = mongoose.model("DailyRecord", dailyRecordSchema);

    const transactionSchema = new mongoose.Schema({
      date: { type: Date, required: true },
      nombre: { type: String, required: true },
      monto: { type: Number, required: true },
      tipo: { type: String, enum: ["ingreso", "gasto"], required: true },
    });

    const recordSchema = new mongoose.Schema({
      date: { type: Date, required: true },
      transacciones: [transactionSchema],
    });

    const Record = mongoose.model("Record", recordSchema);

    // NUEVOS ESQUEMAS PARA CONTACTOS
    const telefonoSchema = new mongoose.Schema({
      numero: { type: String, required: true },
      tipo: {
        type: String,
        enum: ["personal", "trabajo", "movil", "fijo"],
        default: "personal",
      },
    });

    const emailSchema = new mongoose.Schema({
      direccion: { type: String, required: true },
      tipo: {
        type: String,
        enum: ["personal", "trabajo", "principal", "secundario"],
        default: "personal",
      },
    });

    const contactoSchema = new mongoose.Schema({
      nombre: { type: String, required: true },
      empresa: { type: String, default: "" },
      telefonos: [telefonoSchema],
      emails: [emailSchema],
      fechaCreacion: { type: Date, default: Date.now },
    });

    const Contacto = mongoose.model("Contacto", contactoSchema);

    // Rutas existentes
    app.get("/", (req, res) => res.send("🚀 API funcionando correctamente"));

    app.post("/api/records", async (req, res) => {
      try {
        const { date, transacciones } = req.body;

        const record = new Record({
          date,
          transacciones,
        });

        await record.save();
        res.json(record);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get("/api/records", async (req, res) => {
      try {
        const records = await Record.find().sort({ date: 1 });
        res.json(records);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Editar una transacción por ID
    app.put("/api/transactions/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { nombre, monto, tipo } = req.body;

        // Buscar el record que contiene la transacción
        const record = await Record.findOne({ "transacciones._id": id });
        if (!record)
          return res.status(404).json({ error: "Transacción no encontrada" });

        // Actualizar los campos
        const transaction = record.transacciones.id(id);
        if (nombre !== undefined) transaction.nombre = nombre;
        if (monto !== undefined) transaction.monto = monto;
        if (tipo !== undefined) transaction.tipo = tipo;

        await record.save();
        res.json(transaction);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Eliminar una transacción por ID
    app.delete("/api/transactions/:id", async (req, res) => {
      try {
        const { id } = req.params;

        // Validación de ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ error: "ID de transacción inválido" });
        }

        const record = await Record.findOne({ "transacciones._id": id });
        if (!record)
          return res.status(404).json({ error: "Transacción no encontrada" });

        console.log("Record antes de borrar:", record);
        console.log("Transacción a borrar:", id);

        // Filtrar el array para eliminar la transacción
        record.transacciones = record.transacciones.filter(
          (t) => t._id.toString() !== id
        );

        console.log("Record después de borrar:", record);

        await record.save();

        res.json({ message: "Transacción eliminada correctamente" });
      } catch (error) {
        console.error("Error al eliminar la transacción:", error);
        res.status(500).json({ error: "Error interno del servidor" });
      }
    });

    // NUEVAS RUTAS PARA CONTACTOS

    // Obtener todos los contactos
    app.get("/api/contactos", async (req, res) => {
      try {
        const contactos = await Contacto.find().sort({ fechaCreacion: -1 });
        res.json(contactos);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Crear un nuevo contacto
    app.post("/api/contactos", async (req, res) => {
      try {
        const { nombre, empresa, telefonos, emails } = req.body;

        // Validación
        if (!nombre || nombre.trim() === "") {
          return res.status(400).json({ error: "El nombre es obligatorio" });
        }

        const contacto = new Contacto({
          nombre: nombre.trim(),
          empresa: empresa?.trim() || "",
          telefonos: telefonos || [],
          emails: emails || [],
        });

        await contacto.save();
        res.json(contacto);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Actualizar un contacto
    app.put("/api/contactos/:id", async (req, res) => {
      try {
        const { id } = req.params;
        const { nombre, empresa, telefonos, emails } = req.body;

        // Validación de ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ error: "ID de contacto inválido" });
        }

        // Validación
        if (!nombre || nombre.trim() === "") {
          return res.status(400).json({ error: "El nombre es obligatorio" });
        }

        const contacto = await Contacto.findByIdAndUpdate(
          id,
          {
            nombre: nombre.trim(),
            empresa: empresa?.trim() || "",
            telefonos: telefonos || [],
            emails: emails || [],
          },
          { new: true }
        );

        if (!contacto) {
          return res.status(404).json({ error: "Contacto no encontrado" });
        }

        res.json(contacto);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Eliminar un contacto
    app.delete("/api/contactos/:id", async (req, res) => {
      try {
        const { id } = req.params;

        // Validación de ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ error: "ID de contacto inválido" });
        }

        const contacto = await Contacto.findByIdAndDelete(id);

        if (!contacto) {
          return res.status(404).json({ error: "Contacto no encontrado" });
        }

        res.json({ message: "Contacto eliminado correctamente" });
      } catch (error) {
        console.error("Error al eliminar el contacto:", error);
        res.status(500).json({ error: "Error interno del servidor" });
      }
    });

    // Obtener un contacto por ID
    app.get("/api/contactos/:id", async (req, res) => {
      try {
        const { id } = req.params;

        // Validación de ObjectId
        if (!mongoose.Types.ObjectId.isValid(id)) {
          return res.status(400).json({ error: "ID de contacto inválido" });
        }

        const contacto = await Contacto.findById(id);

        if (!contacto) {
          return res.status(404).json({ error: "Contacto no encontrado" });
        }

        res.json(contacto);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.listen(PORT, () =>
      console.log(`✅ API corriendo en http://localhost:${PORT}`)
    );
  } catch (error) {
    console.error("❌ Error conectando a MongoDB:", error.message);
  }
};

const ingredienteSchema = new mongoose.Schema({
  proveedor: { type: String, default: "" },
  nombre: { type: String, required: true },
  valor: { type: Number, default: 0, required: true },
  gr: { type: Number, default: 0, required: true },
  fechaCreacion: { type: Date, default: Date.now },
});

const Ingrediente = mongoose.model("Ingrediente", ingredienteSchema);

// Obtener todos los ingredientes
app.get("/api/ingredientes", async (req, res) => {
  try {
    const ingredientes = await Ingrediente.find().sort({ fechaCreacion: -1 });
    res.json(ingredientes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Crear un nuevo ingrediente
app.post("/api/ingredientes", async (req, res) => {
  try {
    const { proveedor, nombre, valor, gr } = req.body;

    // Validación
    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    if (!valor) {
      return res.status(400).json({ error: "El valor es obligatorio" });
    }

    if (!gr) {
      return res
        .status(400)
        .json({ error: "El peso en gramos es obligatorio" });
    }

    const ingrediente = new Ingrediente({
      proveedor: proveedor?.trim() || "",
      nombre: nombre.trim(),
      valor: valor,
      gr: gr,
    });

    await ingrediente.save();
    res.json(ingrediente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar un ingrediente
app.put("/api/ingredientes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { proveedor, nombre, valor, gr } = req.body;

    // Validación de ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de ingrediente inválido" });
    }

    // Validación
    if (!nombre || nombre.trim() === "") {
      return res.status(400).json({ error: "El nombre es obligatorio" });
    }

    if (!valor) {
      return res.status(400).json({ error: "El valor es obligatorio" });
    }

    if (!gr) {
      return res
        .status(400)
        .json({ error: "El peso en gramos es obligatorio" });
    }

    const ingrediente = await Ingrediente.findByIdAndUpdate(
      id,
      {
        proveedor: proveedor?.trim() || "",
        nombre: nombre.trim(),
        valor: valor,
        gr: gr,
      },
      { new: true }
    );

    if (!ingrediente) {
      return res.status(404).json({ error: "Ingrediente no encontrado" });
    }

    res.json(ingrediente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Eliminar un ingrediente
app.delete("/api/ingredientes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validación de ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de ingrediente inválido" });
    }

    const ingrediente = await Ingrediente.findByIdAndDelete(id);

    if (!ingrediente) {
      return res.status(404).json({ error: "Ingrediente no encontrado" });
    }

    res.json({ message: "Ingrediente eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar el ingrediente:", error);
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

// Obtener un ingrediente por ID
app.get("/api/ingredientes/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Validación de ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "ID de ingrediente inválido" });
    }

    const ingrediente = await Ingrediente.findById(id);

    if (!ingrediente) {
      return res.status(404).json({ error: "Ingrediente no encontrado" });
    }

    res.json(ingrediente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

startServer();
