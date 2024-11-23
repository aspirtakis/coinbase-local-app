import React from 'react';
import { Navbar, NavbarBrand, Nav, NavItem, NavLink, Container } from 'reactstrap';
import './Layout.css'; // Add custom styles here

const Layout = ({ children }) => {
  return (
    <div className="layout">
      <Navbar color="dark" dark expand="md">
        <NavbarBrand href="/">Alekos</NavbarBrand>
        <Nav className="me-auto" navbar>
          <NavItem>
            <NavLink href="/">Overview</NavLink>
          </NavItem>
          <NavItem>
            <NavLink href="/trading">Trading</NavLink>
          </NavItem>
          <NavItem>
            <NavLink href="/bot-trading">Bot Trading</NavLink>
          </NavItem>
        </Nav>
      </Navbar>
        <div className='main-content'> {children} </div>
    </div>
  );
};

export default Layout;
