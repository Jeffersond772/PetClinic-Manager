/**
 * Registra en Ventas los productos y servicios facturables de una atención clínica.
 * Debe ejecutarse usando la misma conexión/ transacción que registra la historia.
 * El inventario NO se descuenta aquí: lo descuenta el modelo clínico para evitar hacerlo dos veces.
 */
function redondearMoneda(valor) {
    const numero = Number(valor);
    return Number.isFinite(numero) ? Number(numero.toFixed(2)) : NaN;
}

async function registrarVentaHistoria({ conexion, id_propietario, id_paciente, id_usuario, items }) {
    if (!Array.isArray(items) || items.length === 0) {
        return { id_cuenta: null, total_facturado: 0 };
    }

    const detalleValidado = items.map(item => {
        const cantidad = Number(item.cantidad);
        const precio_unitario = redondearMoneda(item.precio_unitario);

        if (!Number.isFinite(cantidad) || cantidad <= 0 || !Number.isFinite(precio_unitario) || precio_unitario < 0) {
            const error = new Error('Hay un producto o servicio con cantidad o precio inválido');
            error.codigoNegocio = 'ITEM_FACTURACION_INVALIDO';
            throw error;
        }

        return {
            tipo: item.tipo,
            id_producto: item.tipo === 'producto' ? item.id_producto : null,
            id_servicio: item.tipo === 'servicio' ? item.id_servicio : null,
            cantidad,
            precio_unitario,
            costo_unitario: item.tipo === 'producto' ? redondearMoneda(item.costo_unitario) : null,
            subtotal: redondearMoneda(precio_unitario * cantidad)
        };
    });

    const subtotal = redondearMoneda(
        detalleValidado.reduce((suma, item) => suma + item.subtotal, 0)
    );

    const [resultadoCuenta] = await conexion.query(
        `INSERT INTO cuentas (id_propietario, id_paciente, id_usuario, subtotal, total, estado)
     VALUES (?, ?, ?, ?, ?, 'pendiente')`,
        [id_propietario, id_paciente, id_usuario, subtotal, subtotal]
    );

    const id_cuenta = resultadoCuenta.insertId;

    for (const item of detalleValidado) {
        await conexion.query(
            `INSERT INTO detalle_cuenta
       (id_cuenta, tipo, id_producto, id_servicio, cantidad, precio_unitario, costo_unitario, subtotal)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id_cuenta, item.tipo, item.id_producto, item.id_servicio, item.cantidad,
                item.precio_unitario, item.costo_unitario, item.subtotal]
        );
    }

    return { id_cuenta, total_facturado: subtotal };
}

module.exports = { registrarVentaHistoria };