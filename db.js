const { Pool } = require("pg")

const config = {
  database: process.env.DATABASE,
  host: process.env.HOST,
  user: process.env.USERDB,
  password: process.env.PASSWORD,
  port: process.env.PORT
}

const pool = new Pool(config)


/**
 * Tranferencia entre cuentas
 * 
 * node --env-file=.env db.js transferencia id_origen id_destino monto fecha descripcion
 * 
 * @ cuenta_origen -> ID cuenta origen
 * @ cuenta_destino -> ID cuenta destino
 * @ descripcion -> descripcion transacción
 * @ fecha
 * @ monto
 */
const transferencia = async (cuenta_origen, cuenta_destino, descripcion, fecha, monto) => {
  const client = await pool.connect()

  try {
    // Iniciar transacción
    await client.query("BEGIN");

    // Insertar registro en tabla transferencias
    // descripción, fecha, monto, cuenta_origen, cuenta_destino
    const text =  "INSERT INTO transferencias (descripcion, fecha, monto, cuenta_origen, cuenta_destino) VALUES($1,$2,$3,$4,$5) RETURNING *";
    const values = [descripcion, fecha, monto, cuenta_origen, cuenta_destino]

    const result = await client.query(text, values)

    // Actualización de la tabla cuentas
    const textCuenta1 =  "UPDATE cuentas SET saldo = saldo - $1 WHERE id = $2";
    const valuesCuenta1 = [monto, cuenta_origen]

    await client.query(textCuenta1, valuesCuenta1)

    const textCuenta2 =  "UPDATE cuentas SET saldo = saldo + $1 WHERE id = $2";
    const valuesCuenta2 = [monto, cuenta_destino]

    await client.query(textCuenta2, valuesCuenta2)

    // Finalizar transacción
    await client.query("COMMIT")
    console.log(result.rows)
  } catch (error) {
    console.error(error)
    await client.query("ROLLBACK")
  } finally {
    client.release()
    console.log("Operación terminada")
  }
}

/**
 * Función que retorna último 10 registros de transferencias para una cuenta, usando su ID
 * node --env-file=.env consultaTransferencias id
 * 
 * @id -> id de la cuenta a consultar
 */
const consultaTransferencias = async (id) => {
  try {
    const text = 'SELECT * FROM transferencias WHERE cuenta_origen = $1 OR cuenta_destino = $1';
    const values = [id]

    const result = pool.query(text, values)

    console.log((await result).rows)
  } catch (error) {
    console.error(error)
  }
}

/**
 * Función que retorna el saldo de una cuenta según su ID
 * 
 * @id id de cuenta a consultar
 */
const consultaSaldo = async (id) => {
  try {
    const text = 'SELECT * FROM cuentas WHERE id  = $1'
    const values =  [id]

    const result = pool.query(text, values)
    console.log((await result).rows)
  } catch (error) {
    console.error(error)
  }
}



const funciones = {
  transferencia: transferencia,
  consultaTransferencias: consultaTransferencias,
  consultaSaldo: consultaSaldo
}

function ejecutar() {
  /**
   * "Parsear" process argv para obtener argumentos de las funciones
   * 
   * node --env-file=.env db.js transferencia id_origen id_destino monto fecha descripcion
   */
  const transferenciaARGV = process.argv[2]
  const id_origenARGV = process.argv[3]
  const id_destinoARGV = process.argv[4]
  const montoARGV = process.argv[5]
  const fechaARGV = process.argv[6]
  const descripcionARGV = process.argv[7]

//  * node --env-file=.env db.js transferencia id_origen id_destino monto fecha descripcion
  funciones[transferenciaARGV](id_origenARGV, id_destinoARGV, montoARGV, fechaARGV, descripcionARGV)
}

ejecutar()