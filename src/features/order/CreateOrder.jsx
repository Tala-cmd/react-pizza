import { useState } from "react";
import { Form, redirect, useActionData, useNavigation } from "react-router-dom";
import { createOrder } from "../../services/apiRestaurant";
import Button from "../../ui/Button";
import { useDispatch, useSelector } from "react-redux";
import { clearCart, getCart, getTotalCartPrice } from "../cart/cartSlice";
import EmptyCart from '../cart/EmptyCart'
import store from '../../store'
import { formatCurrency } from "../../utilities/helpers";
import { fetchAddress } from "../user/userSlice";

// https://uibakery.io/regex-library/phone-number
const isValidPhone = (str) =>
  /^\+?\d{1,4}?[-.\s]?\(?\d{1,3}?\)?[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}$/.test(
    str
  );

function CreateOrder() {
  const [withPriority, setWithPriority] = useState(false);
  
  const { 
    username, 
    status: addressStatus,
    error: errorAddress, 
    position, 
    address
  } = useSelector((state)=> state.user)
  
  const isLoadingAddress = addressStatus === 'loading'
  
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting'
  
  const formErrors = useActionData()
  const dispatch = useDispatch()

  const cart = useSelector(getCart);
  const totalCartPrice = useSelector(getTotalCartPrice)
  const priorityPrice = withPriority ? totalCartPrice * 0.2 : 0;
  const totalPrice = totalCartPrice + priorityPrice

  if(!cart.length) return <EmptyCart />
  
  return (
    <div className="px-4 py-6">
      <h2 className="mb-8 text-xl font-semibold">Ready to order? Let&apos;s go!</h2>

      

      {/* <Form method="POST"> action='/order/new'*/}
      <Form method="POST">
        <div className="flex flex-col gap-2 mb-5 sm:flex-row sm:items-center">
          <label className="sm:basis-40">First Name</label>
          <div className="grow">
            <input 
              className="w-full input" 
              type="text" 
              name="customer" 
              defaultValue={username}
              required 
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-5 sm:flex-row sm:items-center">
          <label className="sm:basis-40">Phone number</label>
          <div className="grow">
            <input className="w-full input" type="tel" name="phone" required />
            {formErrors?.phone && 
            <p className="p-2 mt-2 text-xs text-red-700 bg-red-100 rounded-md">
              {formErrors.phone}
            </p>}
          </div>
        </div>

        <div className="relative flex flex-col gap-2 mb-5 sm:flex-row sm:items-center"> 
          <label className="sm:basis-40">Address</label>
          <div className="grow">
            <input 
              className="w-full input"
              type="text" 
              name="address" 
              required 
              disabled = {isLoadingAddress}
              defaultValue={address}
            />
            {addressStatus === 'error' && 
            <p className="p-2 mt-2 text-xs text-red-700 bg-red-100 rounded-md">
              {errorAddress}
            </p>}
            
          </div>
          {!position.latitude && !position.longitude && 
          <span className="absolute right-[3px] top-[35px] z-20 sm:top-[3px] md:right-[5px] md:top-[5px]">
              <Button 
              disabled={isLoadingAddress}
              type='small' 
              onClick={(e)=> {
                e.preventDefault()
                dispatch(fetchAddress())
              }}>GET POSITION 
            </Button>
          </span>}
        </div>

        <div className="flex items-center gap-5 mb-12">
          <input
            className="w-6 h-6 accent-yellow-400 focus:ring focus:ring-yellow-400 focus:outline-none focus:ring-offset-2"
            type="checkbox"
            name="priority"
            id="priority"
            value={withPriority}
            onChange={(e) => setWithPriority(e.target.checked)}
          />
          <label className="font-medium" htmlFor="priority">Want to yo give your order priority?</label>
        </div>

        <div>
          <Button 
            type='primary'
            disabled={isSubmitting || isLoadingAddress}>
            {isSubmitting ? 'Placing order...' : `Order now - ${formatCurrency(totalPrice)}`}
          </Button>
          <input type="hidden" name="cart" value={JSON.stringify(cart)} />
          <input 
            type="hidden" 
            name="position" 
            value= {position.latitude && position.longitude ? 
            `${position.latitude}, ${position.longitude}` : ''}
          />
        </div>
        
      </Form>
    </div>
  );
}

export async function action({ request }){
  const formData = await request.formData()
  const data = Object.fromEntries(formData)

  const order ={
    ...data,
    cart: JSON.parse(data.cart),
    priority: data.priority === 'true'
  }

  const errors ={}
  if(!isValidPhone(order.phone))
    errors.phone = "Please give us your correct phone number. We might need it to contact you."

  if(Object.keys(errors).length > 0) return errors;

  //If everything is okay, create new order and redirect
  const newOrder = await createOrder(order)

  //Do NOT overuse
  store.dispatch(clearCart())
  
  return redirect(`/order/${newOrder.id}`);
  
}

export default CreateOrder;
